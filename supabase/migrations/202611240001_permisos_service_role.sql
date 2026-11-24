-- El backend usa service_role después de validar la sesión y el perfil del administrador.
-- RLS no sustituye los privilegios SQL; concede las operaciones de datos que usa la API.
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
