import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function BibliotecaRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
