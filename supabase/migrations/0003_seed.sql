-- Migration 0003: seed verified Kanpur institutions, branches, subjects
-- Universities are distinguished from colleges/institutes via `type`.
-- Colleges/institutes carry `affiliated_to` pointing at their university.

begin;

-- ============================================================ UNIVERSITIES
insert into public.institutions (name, short_name, type, city, state, website, established_year, verified) values
  ('Chhatrapati Shahu Ji Maharaj University', 'CSJMU', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.csjmu.ac.in', 1966, true),
  ('Harcourt Butler Technical University', 'HBTU', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.hbtu.ac.in', 1921, true),
  ('Rama University', 'Rama University', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.ramauniversity.ac.in', 2015, true),
  ('Chandra Shekhar Azad University of Agriculture and Technology', 'CSA University', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.csau.res.in', 1975, true),
  ('Indian Institute of Technology Kanpur', 'IIT Kanpur', 'university', 'Kanpur', 'Uttar Pradesh',
   'https://www.iitk.ac.in', 1959, true),
  ('Dr. A.P.J. Abdul Kalam Technical University', 'AKTU', 'university', 'Lucknow', 'Uttar Pradesh',
   'https://aktu.ac.in', 2000, true)
on conflict (name) do nothing;

-- ================================================== COLLEGES / INSTITUTES
-- Affiliated to AKTU (subquery resolves AKTU's uuid at insert time).
insert into public.institutions (name, short_name, type, city, state, affiliated_to, website, established_year, verified) values
  ('Pranveer Singh Institute of Technology', 'PSIT', 'college', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.psit.ac.in', 2006, true),
  ('Ambalika Institute of Technology and Management', 'AITH', 'college', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.ambalika.ac.in', 2008, true),
  ('Uttar Pradesh Textile Technology Institute', 'UPTTI', 'institute', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.uptti.ac.in', 1914, true),
  ('National Sugar Institute', 'NSI', 'institute', 'Kanpur', 'Uttar Pradesh',
   (select id from public.institutions where short_name = 'AKTU'),
   'https://www.nsi-india.org', 1936, true)
on conflict (name) do nothing;

-- ================================================================= BRANCHES
insert into public.branches (name, code) values
  ('Computer Science and Engineering', 'CSE'),
  ('Information Technology', 'IT'),
  ('Electronics and Communication Engineering', 'ECE'),
  ('Electrical Engineering', 'EE'),
  ('Mechanical Engineering', 'ME'),
  ('Civil Engineering', 'CE'),
  ('Chemical Engineering', 'CHE'),
  ('Aeronautical Engineering', 'AE'),
  ('Biotechnology', 'BT'),
  ('Artificial Intelligence and Data Science', 'AI&DS'),
  ('Artificial Intelligence and Machine Learning', 'AI&ML'),
  ('Computer Science and Business Systems', 'CSBS')
on conflict (name) do nothing;

-- ================================================================ SUBJECTS
-- Pattern: FROM branch CROSS JOIN (values ...) WHERE code — joins must
-- precede the WHERE clause in PostgreSQL.

-- ------------------------------ CSE (all 8 semesters)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Basic Electrical Engineering'),
  ('Engineering Mechanics'),
  ('Programming for Problem Solving')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Data Structures'),
  ('Computer Organization and Architecture'),
  ('Object Oriented Programming'),
  ('Discrete Mathematics')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Data Structures and Algorithms'),
  ('Operating Systems'),
  ('Database Management Systems'),
  ('Computer Networks'),
  ('Theory of Computation'),
  ('Digital Electronics')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Design and Analysis of Algorithms'),
  ('Software Engineering'),
  ('Compiler Design'),
  ('Microprocessors and Microcontrollers'),
  ('Artificial Intelligence')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 5, x
from public.branches b
cross join (values
  ('Computer Architecture'),
  ('Advanced Database Systems'),
  ('Network Security'),
  ('Machine Learning'),
  ('Web Technologies'),
  ('Software Testing')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 6, x
from public.branches b
cross join (values
  ('Cloud Computing'),
  ('Data Mining'),
  ('Internet of Things'),
  ('Mobile Computing'),
  ('Distributed Systems')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 7, x
from public.branches b
cross join (values
  ('Deep Learning'),
  ('Natural Language Processing'),
  ('Big Data Analytics'),
  ('Information Security'),
  ('Embedded Systems')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 8, x
from public.branches b
cross join (values
  ('Robotics'),
  ('Computer Vision'),
  ('Software Project Management'),
  ('Blockchain Technology')) as t(x)
where b.code = 'CSE'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ IT (all 8 semesters, CSE-like catalog)
insert into public.subjects (branch_id, semester, name)
select b.id, s.semester, s.name
from public.branches b
cross join (
  select semester, unnest(subjects) as name from (
    values
      (1, array['Engineering Mathematics-I','Engineering Physics','Engineering Chemistry','Basic Electrical Engineering','Engineering Mechanics','Programming for Problem Solving']),
      (2, array['Engineering Mathematics-II','Engineering Graphics','Data Structures','Computer Organization and Architecture','Object Oriented Programming','Discrete Mathematics']),
      (3, array['Data Structures and Algorithms','Operating Systems','Database Management Systems','Computer Networks','Digital Electronics','Theory of Computation']),
      (4, array['Design and Analysis of Algorithms','Software Engineering','Compiler Design','Microprocessors and Microcontrollers','Artificial Intelligence']),
      (5, array['Computer Networks','Machine Learning','Web Technologies','Software Testing','Network Security','Database Systems']),
      (6, array['Cloud Computing','Data Mining','Internet of Things','Mobile Computing','Distributed Systems','Cyber Security']),
      (7, array['Deep Learning','Big Data Analytics','Information Security','Embedded Systems','Natural Language Processing']),
      (8, array['Robotics','Computer Vision','Software Project Management','Blockchain Technology'])
  ) as t(semester, subjects)
) s
where b.code = 'IT'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ ECE (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Basic Electrical Engineering'),
  ('Engineering Mechanics'),
  ('Programming for Problem Solving')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Circuit Theory'),
  ('Analog Electronics'),
  ('Digital Electronics'),
  ('Signals and Systems')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Electromagnetic Theory'),
  ('Electronic Devices and Circuits'),
  ('Communication Systems'),
  ('Digital Signal Processing'),
  ('Control Systems'),
  ('Computer Networks')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('VLSI Design'),
  ('Microprocessors and Microcontrollers'),
  ('Antenna Theory'),
  ('Digital Communication'),
  ('Embedded Systems')) as t(x)
where b.code = 'ECE'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ EE (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Basic Electrical Engineering'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Circuit Theory'),
  ('Electrical Machines-I'),
  ('Engineering Thermodynamics'),
  ('Electromagnetic Theory')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Electrical Machines-II'),
  ('Power Systems'),
  ('Control Systems'),
  ('Electrical Measurements'),
  ('Digital Electronics')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Power Electronics'),
  ('Electrical Drives'),
  ('Microprocessors and Microcontrollers'),
  ('Instrumentation'),
  ('Renewable Energy Sources')) as t(x)
where b.code = 'EE'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ ME (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Engineering Thermodynamics'),
  ('Mechanics of Materials'),
  ('Theory of Machines'),
  ('Fluid Mechanics')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Machine Design'),
  ('Heat Transfer'),
  ('Internal Combustion Engines'),
  ('Manufacturing Technology'),
  ('Control Systems')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Refrigeration and Air Conditioning'),
  ('Industrial Engineering'),
  ('CAD/CAM'),
  ('Mechatronics'),
  ('Automobile Engineering')) as t(x)
where b.code = 'ME'
on conflict (branch_id, semester, name) do nothing;

-- ------------------------------ CE (sem 1-4)
insert into public.subjects (branch_id, semester, name)
select b.id, 1, x
from public.branches b
cross join (values
  ('Engineering Mathematics-I'),
  ('Engineering Physics'),
  ('Engineering Chemistry'),
  ('Engineering Mechanics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 2, x
from public.branches b
cross join (values
  ('Engineering Mathematics-II'),
  ('Engineering Graphics'),
  ('Surveying'),
  ('Mechanics of Materials'),
  ('Fluid Mechanics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 3, x
from public.branches b
cross join (values
  ('Structural Analysis'),
  ('Concrete Technology'),
  ('Geotechnical Engineering'),
  ('Transportation Engineering'),
  ('Hydraulics')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

insert into public.subjects (branch_id, semester, name)
select b.id, 4, x
from public.branches b
cross join (values
  ('Design of Concrete Structures'),
  ('Design of Steel Structures'),
  ('Water Resources Engineering'),
  ('Environmental Engineering'),
  ('Highway Engineering')) as t(x)
where b.code = 'CE'
on conflict (branch_id, semester, name) do nothing;

commit;
