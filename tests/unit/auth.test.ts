import { describe,it,expect } from 'vitest';
import { signupSchema, loginSchema, settingsSchema, deletionSchema } from '@/lib/auth/schemas';
import { safeRedirect } from '@/lib/auth/redirect';
import { money } from '@/lib/format';
describe('validação de autenticação',() => {
  const signup = { fullName:'Pessoa Teste',email:'pessoa@example.com',password:'Uma senha longa 123',confirmPassword:'Uma senha longa 123' };
  it('valida cadastro e normaliza e-mail',() => expect(signupSchema.parse({...signup,email:'PESSOA@EXAMPLE.COM'}).email).toBe('pessoa@example.com'));
  it('rejeita e-mail inválido',() => expect(signupSchema.safeParse({...signup,email:'email'}).success).toBe(false));
  it('rejeita senha curta',() => expect(signupSchema.safeParse({...signup,password:'curta'}).success).toBe(false));
  it('rejeita confirmação divergente',() => expect(signupSchema.safeParse({...signup,confirmPassword:'outra senha longa'}).success).toBe(false));
  it('login aceita senha legada sem impor política de cadastro',() => expect(loginSchema.safeParse({email:signup.email,password:'antiga'}).success).toBe(true));
  it('não permite campos administrativos no cadastro',() => expect(signupSchema.parse({...signup,role:'admin'})).not.toHaveProperty('role'));
  it('limita tamanho de nome e senha',() => expect(signupSchema.safeParse({...signup,fullName:'a'.repeat(101)}).success).toBe(false));
  it('valida preferências permitidas',() => expect(settingsSchema.safeParse({theme:'dark',accent:'purple'}).success).toBe(true));
  it('rejeita preferências arbitrárias',() => expect(settingsSchema.safeParse({theme:'evil',accent:'red'}).success).toBe(false));
  it('exige confirmação exata para excluir a conta',() => expect(deletionSchema.safeParse({password:'senha',confirmation:'excluir'}).success).toBe(false));
});
describe('redirecionamentos',() => {
  it.each(['https://evil.example','//evil.example','/\\evil.example','/api/auth/delete','/nova-senha?next=https://evil.example',null])('bloqueia destino não permitido: %s',(url) => expect(safeRedirect(url)).toBe('/painel'));
  it('permite recuperação',() => expect(safeRedirect('/nova-senha')).toBe('/nova-senha'));
});
describe('apresentação de decimais',() => {
  it('preserva centavos de total acima do limite de precisão de Number',() => expect(money('9007199254740993.29')).toBe('R$ 9.007.199.254.740.993,29'));
  it('formata zero',() => expect(money('0')).toBe('R$ 0,00'));
});
