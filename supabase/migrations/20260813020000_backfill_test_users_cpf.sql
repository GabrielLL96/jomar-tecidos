-- Preenche cpf/telefone dos 2 usuários de teste já existentes (Admin Teste,
-- Cliente Teste) — não é produção real, ver spec
-- 2026-08-13-checkout-identificacao-forcada-design.md, item "Usuários de
-- teste existentes". CPFs válidos gerados pelo algoritmo oficial de dígito
-- verificador (mesmo de src/lib/cpf.ts), não são CPFs de pessoas reais.
-- Rodado via migration (não via client) porque a coluna cpf não tem GRANT de
-- update pra authenticated (mesma barreira já documentada pra users.role).
update public.users set cpf = '11144477735', phone = '(35) 99100-0001'
where email = 'admin.teste@jomartecidos.com.br';

update public.users set cpf = '22255588846', phone = '(35) 99100-0002'
where email = 'cliente.teste@jomartecidos.com.br';

-- Admin Teste já tem endereço padrão (is_default = true) de sessão anterior.
-- Cliente Teste não tinha nenhum endereço cadastrado — cria o padrão agora,
-- pro checkout ter algo pra pré-preencher.
insert into public.addresses (user_id, label, street, city, state, zip_code, is_default)
select u.id, 'Principal', 'Rua Teste, 100', 'Pouso Alegre', 'MG', '37550-000', true
from public.users u
where u.email = 'cliente.teste@jomartecidos.com.br'
  and not exists (select 1 from public.addresses a where a.user_id = u.id);
