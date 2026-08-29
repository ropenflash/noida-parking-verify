-- DEMO DATA only. Do not present these rows as live Noida Authority records.
-- Every official-looking row is flagged is_demo = true and cites a demo source.

insert into public.verification_config (key, value_numeric, description) values
  ('score.locationExact', 30, 'Exact/very close match to an official site'),
  ('score.locationNearby', 15, 'Nearby but not exact official site'),
  ('score.contractActive', 25, 'Active contract found'),
  ('score.contractExpired', 10, 'Historical/expired contract'),
  ('score.operatorMatch', 20, 'Operator matches an active contractor'),
  ('score.attendantLinked', 10, 'Attendant linked to contractor but not independently verified'),
  ('score.rateMatch', 15, 'Amount matches approved rate'),
  ('score.rateDiffers', -20, 'Amount differs from approved rate at an exact match'),
  ('score.receiptOfficial', 10, 'Official-looking authority receipt'),
  ('score.receiptContractor', 5, 'Contractor receipt'),
  ('score.paymentOfficial', 10, 'Official parking payment mechanism'),
  ('score.paymentContractor', 5, 'Contractor payment'),
  ('score.paymentPersonalUpi', 0, 'Personal UPI — not proof of unauthorised collection'),
  ('threshold.exactMatchMeters', 50, 'Distance treated as an exact site match'),
  ('threshold.nearbyMatchMeters', 250, 'Distance treated as nearby, not exact'),
  ('threshold.verifiedMin', 80, 'VERIFIED_LEGAL minimum score'),
  ('threshold.likelyMin', 60, 'LIKELY_LEGAL minimum score'),
  ('threshold.needsVerificationMin', 40, 'NEEDS_VERIFICATION minimum score'),
  ('threshold.potentiallyUnauthorisedMin', 20, 'POTENTIALLY_UNAUTHORISED minimum score')
on conflict (key) do nothing;

insert into public.authority_sources (
  id, source_type, authority, source_title, source_url, source_date,
  effective_date, expiry_date, notes, is_demo
) values
  (
    'a1111111-1111-4111-8111-111111111111',
    'NOIDA_AUTHORITY',
    'Noida Authority',
    'DEMO — Sample Noida Authority parking site listing (not an official extract)',
    'https://www.noidaauthorityonline.in/',
    '2025-04-01',
    '2025-04-01',
    '2027-03-31',
    'Demonstration provenance row. Replace with a real sourced document before any public claim.',
    true
  ),
  (
    'a1111111-1111-4111-8111-111111111112',
    'UP_ETENDER',
    'Uttar Pradesh eTender',
    'DEMO — Sample UP eTender parking contract notice (not an official extract)',
    'https://etender.up.nic.in/',
    '2024-06-15',
    '2024-07-01',
    '2026-06-30',
    'Demonstration provenance row for contractor/contract records.',
    true
  ),
  (
    'a1111111-1111-4111-8111-111111111113',
    'OFFICIAL_NOTICE',
    'Noida Authority',
    'DEMO — Expired cluster notice (historical example)',
    'https://www.noidaauthorityonline.in/',
    '2022-01-10',
    '2022-02-01',
    '2024-01-31',
    'Used to illustrate expired contracts. Not a real notice.',
    true
  );

insert into public.parking_sites (
  id, name, sector, address, landmark, latitude, longitude, parking_type,
  authority, work_circle, cluster, official_status, source_id, source_url, notes, is_demo
) values
  (
    'b2222222-2222-4222-8222-222222222201',
    'Noida Authority Parking near Advant Building, Sector-142',
    '142',
    'Near Advant Navis Business Park, Sector 142, Noida, Uttar Pradesh',
    'Advant Navis / Advant Building',
    28.50002,
    77.41088,
    'COMMERCIAL_COMPLEX',
    'Noida Authority',
    'Work Circle 3',
    'Cluster 142-A',
    'AUTHORISED',
    'a1111111-1111-4111-8111-111111111111',
    'https://www.noidaauthorityonline.in/',
    'DEMO DATA. Approximate coordinates for the Advant Navis area. A nearby match must not be treated as proof that a user''s exact pin is authorised.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222202',
    'Sector 142 Metro parking (demo)',
    '142',
    'Near Sector 142 metro station, Noida',
    'Sector 142 Metro',
    28.4985,
    77.4124,
    'METRO',
    'Noida Authority',
    'Work Circle 3',
    'Cluster 142-M',
    'AUTHORISED',
    'a1111111-1111-4111-8111-111111111111',
    'https://www.noidaauthorityonline.in/',
    'DEMO DATA.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222203',
    'Sector 18 market parking (demo)',
    '18',
    'Atta Market / Sector 18, Noida',
    'Sector 18 Market',
    28.5703,
    77.3260,
    'MARKET',
    'Noida Authority',
    'Work Circle 1',
    'Cluster 18',
    'AUTHORISED',
    'a1111111-1111-4111-8111-111111111111',
    'https://www.noidaauthorityonline.in/',
    'DEMO DATA.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222204',
    'Sector 62 vacant plot parking (expired demo)',
    '62',
    'Near Sector 62, Noida',
    'Vacant plot',
    28.6270,
    77.3640,
    'VACANT_PLOT',
    'Noida Authority',
    'Work Circle 2',
    'Cluster 62',
    'EXPIRED',
    'a1111111-1111-4111-8111-111111111113',
    'https://www.noidaauthorityonline.in/',
    'DEMO DATA — official_status EXPIRED.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222205',
    'Botanical Garden metro parking (demo)',
    '38',
    'Botanical Garden metro station, Noida',
    'Botanical Garden Metro',
    28.5640,
    77.3345,
    'METRO',
    'Noida Authority',
    'Work Circle 1',
    'Cluster 38-M',
    'AUTHORISED',
    'a1111111-1111-4111-8111-111111111111',
    'https://www.noidaauthorityonline.in/',
    'DEMO DATA.',
    true
  );

insert into public.parking_contractors (
  id, legal_name, display_name, contact_phone, contact_email,
  registration_details, source_id, verification_status, notes, is_demo
) values
  (
    'c3333333-3333-4333-8333-333333333301',
    'Demo Authorised Parking Services Pvt Ltd',
    'Demo Authorised Parking',
    null,
    null,
    '{"cin": "DEMO-CIN-0001", "gstin": "DEMO-GST-0001"}'::jsonb,
    'a1111111-1111-4111-8111-111111111112',
    'VERIFIED',
    'DEMO contractor. Not a real registered company.',
    true
  ),
  (
    'c3333333-3333-4333-8333-333333333302',
    'Demo Expired Cluster Operator LLP',
    'Demo Expired Operator',
    null,
    null,
    '{"cin": "DEMO-CIN-0002"}'::jsonb,
    'a1111111-1111-4111-8111-111111111113',
    'EXPIRED',
    'DEMO contractor with an expired contract.',
    true
  ),
  (
    'c3333333-3333-4333-8333-333333333303',
    'Unverified Demo Collector',
    'Unverified Demo Collector',
    null,
    null,
    '{}'::jsonb,
    'a1111111-1111-4111-8111-111111111112',
    'UNVERIFIED',
    'DEMO — included to show unmatched operator handling.',
    true
  );

insert into public.parking_contracts (
  id, contractor_id, parking_site_id, contract_number, cluster, work_circle,
  start_date, end_date, approved_rate, rate_unit, status, source_id, source_url, notes, is_demo
) values
  (
    'd4444444-4444-4444-8444-444444444401',
    'c3333333-3333-4333-8333-333333333301',
    'b2222222-2222-4222-8222-222222222201',
    'DEMO/NA/142/2025/01',
    'Cluster 142-A',
    'Work Circle 3',
    '2025-04-01',
    '2027-03-31',
    20.00,
    'per visit',
    'ACTIVE',
    'a1111111-1111-4111-8111-111111111112',
    'https://etender.up.nic.in/',
    'DEMO active contract for Advant-area parking. Approved rate ₹20 per visit.',
    true
  ),
  (
    'd4444444-4444-4444-8444-444444444402',
    'c3333333-3333-4333-8333-333333333302',
    'b2222222-2222-4222-8222-222222222204',
    'DEMO/NA/62/2022/09',
    'Cluster 62',
    'Work Circle 2',
    '2022-02-01',
    '2024-01-31',
    10.00,
    'per visit',
    'EXPIRED',
    'a1111111-1111-4111-8111-111111111113',
    'https://www.noidaauthorityonline.in/',
    'DEMO expired contract.',
    true
  ),
  (
    'd4444444-4444-4444-8444-444444444403',
    'c3333333-3333-4333-8333-333333333301',
    'b2222222-2222-4222-8222-222222222202',
    'DEMO/NA/142M/2025/02',
    'Cluster 142-M',
    'Work Circle 3',
    '2025-04-01',
    '2027-03-31',
    20.00,
    'per visit',
    'ACTIVE',
    'a1111111-1111-4111-8111-111111111112',
    'https://etender.up.nic.in/',
    'DEMO active metro parking contract.',
    true
  );

insert into public.parking_rates (
  parking_site_id, contract_id, rate_amount, currency, unit, vehicle_type,
  effective_from, effective_to, source_id, notes, is_demo
) values
  (
    'b2222222-2222-4222-8222-222222222201',
    'd4444444-4444-4444-8444-444444444401',
    20.00, 'INR', 'per visit', 'LMV',
    '2025-04-01', '2027-03-31',
    'a1111111-1111-4111-8111-111111111112',
    'DEMO approved rate ₹20.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222202',
    'd4444444-4444-4444-8444-444444444403',
    20.00, 'INR', 'per visit', 'LMV',
    '2025-04-01', '2027-03-31',
    'a1111111-1111-4111-8111-111111111112',
    'DEMO approved rate ₹20.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222204',
    'd4444444-4444-4444-8444-444444444402',
    10.00, 'INR', 'per visit', 'LMV',
    '2022-02-01', '2024-01-31',
    'a1111111-1111-4111-8111-111111111113',
    'DEMO historical rate. Contract expired.',
    true
  ),
  (
    'b2222222-2222-4222-8222-222222222203',
    null,
    20.00, 'INR', 'per visit', 'LMV',
    '2025-04-01', '2027-03-31',
    'a1111111-1111-4111-8111-111111111111',
    'DEMO market rate without a linked contractor row.',
    true
  );
