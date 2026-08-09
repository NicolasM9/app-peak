-- 0016: email del alumno (para cargar los mails de Turnos Web)
alter table alumnos add column if not exists email text;
