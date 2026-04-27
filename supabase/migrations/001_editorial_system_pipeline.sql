-- ==============================================================================
-- PIPELINE EDITORIAL AUTOMÁTICO
-- Função PostgreSQL + Trigger para gerar entradas editoriais
-- Dispara quando um novo strategic_assessment é criado ou atualizado
-- ==============================================================================

-- Função que enfileira a geração de entradas editoriais
-- Esta função é chamada pelo trigger e enfileira o trabalho para ser processado
-- por uma edge function (OpenAI integration)
CREATE OR REPLACE FUNCTION generate_editorial_entries_on_assessment(
  assessment_id UUID
)
RETURNS void AS $$
BEGIN
  -- Enfileira em uma tabela de jobs/queue para processamento assíncrono
  -- A edge function irá:
  -- 1. Coletar dados de brand_knowledge, user_profiles, strategic_assessments
  -- 2. Chamar OpenAI para gerar sugestões editoriais
  -- 3. Inserir em editorial_system

  INSERT INTO editorial_generation_queue (
    assessment_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    assessment_id,
    'pending',
    NOW(),
    NOW()
  )
  ON CONFLICT (assessment_id) DO UPDATE SET
    status = 'pending',
    updated_at = NOW();

  -- Notifica via LISTEN/NOTIFY para disparar edge function em tempo real
  -- (opcional - se quiser processamento síncrono)
  PERFORM pg_notify('editorial_generation', json_build_object(
    'assessment_id', assessment_id,
    'action', 'generate'
  )::text);
END;
$$ LANGUAGE plpgsql;


-- Trigger que dispara quando um novo assessment é criado
CREATE OR REPLACE TRIGGER trigger_generate_editorial_on_new_assessment
AFTER INSERT OR UPDATE ON strategic_assessments
FOR EACH ROW
BEGIN
  PERFORM generate_editorial_entries_on_assessment(NEW.id);
END;
$$ LANGUAGE plpgsql;


-- Função auxiliar para buscar contexto da marca para gerar conteúdo
-- Retorna JSON com todos os dados necessários para a geração
CREATE OR REPLACE FUNCTION get_brand_context_for_editorial(
  user_id_param UUID
)
RETURNS jsonb AS $$
DECLARE
  brand_knowledge_data jsonb;
  user_profile_data jsonb;
  assessments_data jsonb;
BEGIN
  -- Busca fatos de conhecimento ativo
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'content', content,
      'form_type', form_type,
      'status', status,
      'source_table', source_table
    )
  ) INTO brand_knowledge_data
  FROM brand_knowledge
  WHERE user_id = user_id_param AND status = 'active'
  LIMIT 50;

  -- Busca perfil/contexto da marca
  SELECT jsonb_build_object(
    'user_id', id,
    'name', name,
    'business_stage', business_stage,
    'market_niche', market_niche,
    'main_services', main_services,
    'ideal_client', ideal_client,
    'priority_channels', priority_channels,
    'weekly_content_frequency', weekly_content_frequency
  ) INTO user_profile_data
  FROM user_profiles
  WHERE id = user_id_param
  LIMIT 1;

  -- Busca últimos assessments (para contexto)
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'assessment_json', assessment_json,
      'status', status,
      'created_at', created_at
    )
  ) INTO assessments_data
  FROM strategic_assessments
  WHERE user_id = user_id_param
  ORDER BY created_at DESC
  LIMIT 3;

  -- Retorna tudo junto
  RETURN jsonb_build_object(
    'user_id', user_id_param,
    'brand_knowledge', COALESCE(brand_knowledge_data, '[]'::jsonb),
    'user_profile', COALESCE(user_profile_data, '{}'::jsonb),
    'recent_assessments', COALESCE(assessments_data, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql;


-- Tabela de fila para enfileirar gerações editoriais
-- Será consultada pela edge function/cron
CREATE TABLE IF NOT EXISTS editorial_generation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE REFERENCES strategic_assessments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempt_count int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at timestamp with time zone NOT NULL DEFAULT NOW()
);

-- Índice para buscar jobs pendentes
CREATE INDEX IF NOT EXISTS idx_editorial_queue_status ON editorial_generation_queue(status)
WHERE status = 'pending';

-- Índice para limpeza de jobs antigos
CREATE INDEX IF NOT EXISTS idx_editorial_queue_created_at ON editorial_generation_queue(created_at);


-- Função para marcar um job como processado
CREATE OR REPLACE FUNCTION mark_editorial_generated(
  assessment_id UUID,
  success BOOLEAN,
  error_msg TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  UPDATE editorial_generation_queue
  SET
    status = CASE WHEN success THEN 'completed' ELSE 'failed' END,
    last_error = error_msg,
    attempt_count = attempt_count + 1,
    updated_at = NOW()
  WHERE assessment_id = assessment_id;
END;
$$ LANGUAGE plpgsql;


-- Política de segurança: apenas leitura/escrita na tabela de fila
-- (opcional - se usar RLS)
ALTER TABLE editorial_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their editorial queue"
  ON editorial_generation_queue
  FOR SELECT
  USING (
    assessment_id IN (
      SELECT id FROM strategic_assessments WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role only for queue management"
  ON editorial_generation_queue
  FOR ALL
  USING (auth.role() = 'service_role');
