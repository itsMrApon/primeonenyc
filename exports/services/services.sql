-- Prime One services: services, their downloadable docs, key-dates calendar, section copy.
-- Generated from content/services.json by tools/export-services.mjs.
-- Standard SQL (PostgreSQL / Supabase, MySQL, SQLite).

CREATE TABLE IF NOT EXISTS services (
  id          VARCHAR(64) PRIMARY KEY,
  no          INTEGER NOT NULL,       -- display order
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(16) NOT NULL,   -- chip label on calendar rows
  logo        VARCHAR(255),
  headline    VARCHAR(255),
  details     TEXT,                   -- paragraph shown when the service row opens
  ready       VARCHAR(16),            -- turnaround in the open row, e.g. 24
  ready_unit  VARCHAR(16),            -- e.g. hrs, day, wk
  featured    BOOLEAN NOT NULL DEFAULT FALSE  -- lime laurel on the row
);

CREATE TABLE IF NOT EXISTS service_docs (
  id          VARCHAR(80) PRIMARY KEY,
  service_id  VARCHAR(64) NOT NULL REFERENCES services (id),
  sort        INTEGER NOT NULL,       -- order within the service
  name        VARCHAR(120) NOT NULL,
  code        VARCHAR(16) NOT NULL,   -- form no. on the chip: MV-82, W-4
  issuer      VARCHAR(64),            -- NY DMV, IRS, USCIS, Prime One
  format      VARCHAR(8) NOT NULL DEFAULT 'PDF',
  url         VARCHAR(500) NOT NULL   -- file link (dashboard upload or official form)
);

CREATE TABLE IF NOT EXISTS calendar_events (
  id          VARCHAR(64) PRIMARY KEY,
  event_date  DATE NOT NULL,
  title       VARCHAR(120) NOT NULL,
  service_id  VARCHAR(64) NOT NULL REFERENCES services (id),
  perk        VARCHAR(32) NOT NULL,   -- big value, e.g. 20%, Free, Gift
  perk_suffix VARCHAR(32),            -- small text after it, e.g. early bird
  gift        BOOLEAN NOT NULL DEFAULT FALSE,
  gov         VARCHAR(32) NOT NULL,   -- e.g. Due, $340, 5%
  gov_unit    VARCHAR(64),            -- e.g. IRS, per late form
  note        TEXT                    -- hover text on the row
);

CREATE TABLE IF NOT EXISTS section_labels (
  section     VARCHAR(32) NOT NULL,   -- calendar | forms
  label_key   VARCHAR(64) NOT NULL,
  label       TEXT NOT NULL,
  PRIMARY KEY (section, label_key)
);

INSERT INTO services (id, no, name, code, logo, headline, details, ready, ready_unit, featured) VALUES
  ('insurance', 1, 'Insurance', 'INS', 'Blue shield', 'Where protection meets perfection.', 'Auto, motorcycle and personal cover from top carriers. We compare quotes side by side, explain every line in plain English or Bangla, and keep your policy current when life changes.', '24', 'hrs', TRUE),
  ('tlc-insurance', 2, 'TLC Insurance', 'TLC', 'Yellow taxi roof sign', 'Your cab earns. We keep it covered.', 'Liability and physical damage cover built for yellow cabs, green cabs and black cars. We file straight with the TLC so your plates never sit idle.', '24', 'hrs', TRUE),
  ('tlc-express', 3, 'TLC Express', 'TLC EXP', 'Green speed badge', 'Moving plates? We do the paperwork.', 'New car, plate transfer or base change: we prepare and file the TLC paperwork, book your inspection and follow it through to the finish.', '1', 'day', FALSE),
  ('dmv-express', 4, 'DMV Express', 'DMV', 'License plate', 'Came in for plates. Left with plates.', 'Registrations, renewals, plates and title transfers without the DMV line. Bring your papers, we handle the rest and hand you the plates.', '1', 'day', TRUE),
  ('tax', 5, 'Tax', 'TAX', 'Orange receipt', 'Tax season, made easy.', 'Personal, self-employed and rideshare returns, plus IRS and New York letters. Federal and state filed together, every credit checked.', '2', 'days', TRUE),
  ('travel', 6, 'Travel', 'TRAVEL', 'Boarding pass', 'Book the flight. We handle the rest.', 'Flights home and holidays abroad, booked at fair fares. We check passports and visas before you pay, so nothing stops you at the gate.', '1', 'day', FALSE),
  ('courses', 7, 'Courses', 'COURSE', 'Purple road sign', 'Learn the rules. Own the road.', '5-hour pre-licensing and defensive driving courses in English and Bangla. Pass the road test, take points off and cut your insurance.', '1', 'day', FALSE),
  ('notary', 8, 'Notary', 'NOTARY', 'Round burgundy seal', 'Sign it. Seal it. Done.', 'Affidavits, leases, titles and letters signed and sealed while you wait. Walk in with ID, walk out notarized.', '15', 'min', FALSE),
  ('business-insurance', 9, 'Business Insurance', 'BIZ', 'Storefront with awning', 'You run the shop. We cover the shop.', 'General liability, property and commercial auto for shops, restaurants and contractors, with certificates for landlords and clients the same day.', '48', 'hrs', FALSE),
  ('rideshare', 10, 'Rideshare', 'RIDE', 'Map pin', 'You drive the app. We cover the gap.', 'Uber and Lyft drivers: your personal policy stops when the app turns on. We add the rideshare cover that fills the gap.', '24', 'hrs', FALSE),
  ('home-landlord', 11, 'Home & Landlord', 'HOME', 'House', 'Your home. Your rental. Covered.', 'Homeowners, condo and landlord policies for one- to four-family homes. Cover the building, the rent and the people who live there.', '48', 'hrs', FALSE),
  ('life-disability', 12, 'Life & Disability', 'LIFE', 'Heart', 'For the people who count on you.', 'Term and whole life, plus disability income cover that pays your bills if you can''t work. Simple plans for the people who count on you.', '1', 'wk', FALSE),
  ('workers-comp', 13, 'Workers’ Comp', 'COMP', 'Hard hat', 'Protect your crew. Protect your business.', 'New York requires it once you hire. We set up workers'' comp and disability (DBL/PFL) cover and keep your certificates current.', '48', 'hrs', FALSE),
  ('business-setup', 14, 'Business Setup', 'SETUP', 'Hanging “Now Open” sign', 'Got the idea? Let’s make it official.', 'LLC and corporation formation, EIN, sales tax registration and a business bank-ready file. Your idea, made official.', '1', 'wk', FALSE),
  ('payroll-sales-tax', 15, 'Payroll & Sales Tax', 'PAY', 'Calculator', 'Pay your team. Skip the headache.', 'Weekly or bi-weekly payroll, W-2s and 1099s, plus New York sales tax returns filed on time, every quarter.', '2', 'days', FALSE),
  ('immigration-forms', 16, 'Immigration Forms', 'IMMIG', 'Passport', 'The right forms, filled out with care.', 'Citizenship, green card renewal, family petitions and work permits: the right USCIS forms, filled out with care. We prepare forms; we do not give legal advice.', '1', 'wk', FALSE);

INSERT INTO service_docs (id, service_id, sort, name, code, issuer, format, url) VALUES
  ('dmv-express-01', 'dmv-express', 1, 'Registration / title application', 'MV-82', 'NY DMV', 'PDF', 'https://dmv.ny.gov/forms/mv82.pdf'),
  ('tax-01', 'tax', 1, 'Individual tax return', '1040', 'IRS', 'PDF', 'https://www.irs.gov/pub/irs-pdf/f1040.pdf'),
  ('tax-02', 'tax', 2, 'ITIN application', 'W-7', 'IRS', 'PDF', 'https://www.irs.gov/pub/irs-pdf/fw7.pdf'),
  ('tax-03', 'tax', 3, 'Taxpayer ID request', 'W-9', 'IRS', 'PDF', 'https://www.irs.gov/pub/irs-pdf/fw9.pdf'),
  ('courses-01', 'courses', 1, 'Learner permit application', 'MV-44', 'NY DMV', 'PDF', 'https://dmv.ny.gov/forms/mv44.pdf'),
  ('business-setup-01', 'business-setup', 1, 'EIN application', 'SS-4', 'IRS', 'PDF', 'https://www.irs.gov/pub/irs-pdf/fss4.pdf'),
  ('payroll-sales-tax-01', 'payroll-sales-tax', 1, 'Employee withholding', 'W-4', 'IRS', 'PDF', 'https://www.irs.gov/pub/irs-pdf/fw4.pdf'),
  ('payroll-sales-tax-02', 'payroll-sales-tax', 2, 'NY employee withholding', 'IT-2104', 'NY DTF', 'PDF', 'https://www.tax.ny.gov/pdf/current_forms/it/it2104_fill_in.pdf'),
  ('payroll-sales-tax-03', 'payroll-sales-tax', 3, 'Employment eligibility', 'I-9', 'USCIS', 'PDF', 'https://www.uscis.gov/sites/default/files/document/forms/i-9.pdf'),
  ('immigration-forms-01', 'immigration-forms', 1, 'Citizenship application', 'N-400', 'USCIS', 'PDF', 'https://www.uscis.gov/sites/default/files/document/forms/n-400.pdf'),
  ('immigration-forms-02', 'immigration-forms', 2, 'Green card renewal', 'I-90', 'USCIS', 'PDF', 'https://www.uscis.gov/sites/default/files/document/forms/i-90.pdf'),
  ('immigration-forms-03', 'immigration-forms', 3, 'Work permit application', 'I-765', 'USCIS', 'PDF', 'https://www.uscis.gov/sites/default/files/document/forms/i-765.pdf');

INSERT INTO calendar_events (id, event_date, title, service_id, perk, perk_suffix, gift, gov, gov_unit, note) VALUES
  ('efile-opens-2026', '2026-01-26', 'E-file season opens', 'tax', '20%', 'early bird', TRUE, '21 days', 'avg refund', 'File in the first two weeks: 20% off your return and a welcome gift.'),
  ('new-year-llc-2026', '2026-01-31', 'New-year LLC', 'business-setup', 'Free', 'EIN filing', FALSE, '$200', 'NY filing fee', 'Form your LLC with us in January and we file your EIN for free.'),
  ('w2-1099-2026', '2026-02-02', 'W-2 & 1099 due', 'payroll-sales-tax', 'Free', '1st run', FALSE, '$340', 'per late form', 'Employee and contractor forms are due. Your first payroll run with us is free.'),
  ('plate-transfer-2026', '2026-03-02', 'Plate transfer week', 'tlc-express', '24h', 'filing', FALSE, 'TLC', 'inspection req''d', 'Moving plates to a new car? We file the TLC paperwork in a day.'),
  ('point-reduction-2026', '2026-03-09', 'Point reduction course', 'courses', '15%', 'off course', FALSE, '10%', 'ins. cut 3 yrs', 'NY defensive driving cuts your insurance 10% for three years and can take points off.'),
  ('business-returns-2026', '2026-03-16', 'Business returns', 'tax', '10%', 'off', FALSE, 'Due', 'S-corp & LLC', 'S-corp and partnership returns (or extensions) are due.'),
  ('registration-rush-2026', '2026-04-01', 'Spring registration rush', 'dmv-express', '24h', 'plates', FALSE, 'Ticket', 'if expired', 'Registrations, renewals and plates without the DMV line.'),
  ('tax-day-2026', '2026-04-15', 'Tax day', 'tax', 'Gift', 'card', TRUE, '5%', 'per month late', 'Federal and New York returns are due. Every return filed with us gets a gift card.'),
  ('small-business-week-2026', '2026-05-04', 'Small business week', 'workers-comp', 'Free', 'audit', TRUE, '$2,000', 'per 10 days uncovered', 'Workers'' comp is required in New York. Free coverage audit and a gift for every business owner.'),
  ('eid-travel-2026', '2026-05-11', 'Eid travel booking', 'travel', '5%', 'off fares', TRUE, '6 mo', 'passport validity', 'Book Eid flights early: 5% off fares and a travel gift.'),
  ('summer-surge-2026', '2026-05-25', 'Summer driving surge', 'rideshare', 'Free', 'gap quote', FALSE, 'Gap', 'personal policy', 'Personal auto policies usually exclude app driving. We close the gap.'),
  ('hurricane-season-2026', '2026-06-01', 'Hurricane season', 'home-landlord', 'Free', 'review', FALSE, '30 days', 'flood wait', 'Flood cover takes 30 days to start. Get your home or rental reviewed before the storms.'),
  ('sales-tax-q2-2026', '2026-06-22', 'Sales tax quarter', 'payroll-sales-tax', 'Free', '1st filing', FALSE, 'Due', 'NY DTF', 'Quarterly New York sales tax return. Your first filing with us is free.'),
  ('rent-registration-2026', '2026-07-31', 'Rent registration', 'home-landlord', 'Free', 'landlord review', FALSE, 'Due', 'NY HCR', 'Annual rent registration for stabilized units. Free landlord policy review while you''re here.'),
  ('lease-signing-2026', '2026-08-31', 'Lease & title signing', 'notary', 'Free', '1st stamp', FALSE, '$2', 'NY max per stamp', 'Moving season: leases, titles and affidavits signed and sealed on the spot.'),
  ('life-insurance-month-2026', '2026-09-01', 'Life insurance month', 'life-disability', 'Gift', 'box', TRUE, 'Tax-free', 'payout', 'September is Life Insurance Awareness Month. Free quote and a family gift box.'),
  ('citizenship-day-2026', '2026-09-17', 'Citizenship day', 'immigration-forms', 'Free', 'N-400 review', FALSE, '$710', 'N-400 online fee', 'Citizenship Day: we review your N-400 for free before you file.'),
  ('winter-flights-2026', '2026-10-05', 'Winter-break flights', 'travel', 'Gift', 'travel kit', TRUE, 'Real ID', 'for US flights', 'Book winter-break flights with us and take home a travel kit.'),
  ('extension-deadline-2026', '2026-10-15', 'Extension deadline', 'tax', 'Free', 'e-file', FALSE, 'Final', 'no more time', 'Last day for extended personal returns. We e-file it for free.'),
  ('holiday-rush-2026', '2026-11-20', 'Holiday driving rush', 'tlc-insurance', 'Free', 'quote', TRUE, 'Suspend', 'on lapse', 'TLC suspends your plates if insurance lapses. Renew before the busiest weeks.'),
  ('small-business-saturday-2026', '2026-11-28', 'Small business Saturday', 'business-insurance', 'Free', 'COI', TRUE, 'COI', 'for most leases', 'Liability quote plus a free certificate of insurance for your landlord or client.'),
  ('winter-driving-2026', '2026-12-01', 'Winter driving check', 'insurance', '15%', 'bundle', FALSE, '$8', 'per day lapse', 'Bundle auto with home for 15% off. NY fines every day your car is uninsured.'),
  ('sales-tax-q3-2026', '2026-12-21', 'Sales tax quarter', 'payroll-sales-tax', 'Free', '1st filing', FALSE, 'Due', 'NY DTF', 'Quarterly New York sales tax return.'),
  ('year-end-writeoffs-2026', '2026-12-31', 'Year-end write-offs', 'tax', 'Free', 'review', FALSE, '100%', 'bonus deduction', 'Equipment bought before Dec 31 can be written off this year. Free year-end review.'),
  ('q4-estimated-2027', '2027-01-15', 'Q4 estimated tax', 'tax', 'Free', 'check', FALSE, 'Due', 'IRS', 'Last 2026 estimated payment. We check your numbers for free.'),
  ('efile-opens-2027', '2027-01-25', 'E-file season opens', 'tax', '20%', 'early bird', TRUE, '21 days', 'avg refund', 'File early: 20% off your return and a welcome gift.'),
  ('tax-day-2027', '2027-04-15', 'Tax day', 'tax', 'Gift', 'card', TRUE, '5%', 'per month late', 'Federal and New York returns are due. Every return filed with us gets a gift card.');

INSERT INTO section_labels (section, label_key, label) VALUES
  ('calendar', 'no', 'No.'),
  ('calendar', 'noMobile', 'No.'),
  ('calendar', 'event', 'Key date'),
  ('calendar', 'when', 'When'),
  ('calendar', 'perk', 'Your perk'),
  ('calendar', 'perkMobile', 'Perk'),
  ('calendar', 'gov', 'Gov says'),
  ('calendar', 'govMobile', 'Gov'),
  ('forms', 'titleTop', 'Services'),
  ('forms', 'titleBottom', '& forms'),
  ('forms', 'body', 'Pick a service to see what we do. <br>Every form you need, ready to download.'),
  ('forms', 'columns.open', 'Open'),
  ('forms', 'columns.service', 'Service'),
  ('forms', 'columns.docs', 'Docs'),
  ('forms', 'columns.ready', 'Ready in'),
  ('forms', 'columns.no', 'No.'),
  ('forms', 'columns.doc', 'Document'),
  ('forms', 'columns.from', 'From'),
  ('forms', 'columns.format', 'Format'),
  ('forms', 'columns.download', 'Download'),
  ('forms', 'columns.noDocs', 'Documents coming soon');
