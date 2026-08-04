SELECT 
    table_schema, 
    table_name 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'logs', 'notification') 
ORDER BY table_schema, table_name;

SELECT 
    tc.table_schema, 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type 
FROM information_schema.table_constraints tc 
WHERE tc.table_schema IN ('public', 'logs', 'notification') 
ORDER BY tc.table_schema, tc.table_name, tc.constraint_type;

SELECT 
    schemaname, 
    tablename, 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE schemaname IN ('public', 'logs', 'notification') 
ORDER BY schemaname, tablename, indexname;
