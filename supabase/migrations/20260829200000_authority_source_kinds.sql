-- Add supported authority source kinds. Existing values remain for demo/legacy rows.
alter type public.source_type add value if not exists 'RTI_RESPONSE';
alter type public.source_type add value if not exists 'GOVERNMENT_NOTICE';
alter type public.source_type add value if not exists 'OFFICIAL_DOCUMENT';
