-- Check Existing Indexes
-- This script shows all current indexes to avoid duplicates

SELECT
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY
    relname,
    indexrelname;

-- Count indexes per table
SELECT
    relname as tablename,
    COUNT(*) as index_count,
    pg_size_pretty(SUM(pg_relation_size(indexrelid))) AS total_index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
GROUP BY relname
ORDER BY COUNT(*) DESC;

-- Show most frequently scanned tables (candidates for indexing)
SELECT
    schemaname,
    relname as tablename,
    seq_scan as sequential_scans,
    seq_tup_read as rows_read_seq,
    idx_scan as index_scans,
    idx_tup_fetch as rows_fetched_idx,
    CASE 
        WHEN seq_scan = 0 THEN 0
        ELSE ROUND((100.0 * idx_scan / (seq_scan + idx_scan)), 2)
    END as index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY seq_scan DESC
LIMIT 20;

