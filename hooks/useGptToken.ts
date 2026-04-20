import { useEffect, useState } from 'react';
import { createToken } from '../lib/api/dashboard';
import type { GptToken } from '../types/dashboard';

interface UseGptTokenOptions {
  initialTokens: GptToken[];
  token: string;
  onSaved: (message?: string) => void;
  onError: (message: string) => void;
}

function findVisibleToken(tokens: GptToken[]): string {
  return (
    tokens.find((item) => item.status === 'active' && item.token_value)?.token_value ||
    tokens.find((item) => item.token_value)?.token_value ||
    ''
  );
}

export function useGptToken({ initialTokens, token, onSaved, onError }: UseGptTokenOptions) {
  const [createdToken, setCreatedToken] = useState('');
  const [tokenCopied, setTokenCopied] = useState(false);
  const [savingToken, setSavingToken] = useState(false);

  useEffect(() => {
    setCreatedToken(findVisibleToken(initialTokens));
    setTokenCopied(false);
  }, [initialTokens]);

  async function generateToken() {
    setSavingToken(true);

    try {
      const data = await createToken(token);
      setCreatedToken(data.token || '');
      setTokenCopied(false);
      onSaved();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Erro ao gerar token.');
    } finally {
      setSavingToken(false);
    }
  }

  async function copyCurrentToken() {
    if (!createdToken) {
      onError('Nenhum token disponível para copiar.');
      return;
    }

    try {
      await navigator.clipboard.writeText(createdToken);
      setTokenCopied(true);
      onSaved('Copiado');
      window.setTimeout(() => setTokenCopied(false), 1600);
    } catch {
      onError('Falha ao copiar o token.');
    }
  }

  return {
    createdToken,
    tokenCopied,
    savingToken,
    createToken: generateToken,
    copyCurrentToken,
  };
}
