# Prerequisite conflicts found during data normalization

32 courses had different prerequisites listed in different curricula. The majority value became the default in `courses.json`; the minority values are kept as an explicit `prerequisitesOverride` on the curriculum entries that need them, so no data was lost. Please review — some of these are probably intentional (a course open to multiple majors can reasonably need a different prior course per department), others may be data-entry gaps.

## 001102 English 2

Default (majority): `['001101']`

- `('001101',)` — **default**, used by: cpe2563-coop:option/languageLiteracy, cpe2563-regular:option/languageLiteracy, cpe2568-coop-s1:option/languageLiteracy, cpe2568-coop-s2:option/languageLiteracy, cpe2568-regular:option/languageLiteracy, isce2569-cysec-coop:option/languageLiteracy, isce2569-cysec-regular:option/languageLiteracy, isce2569-infosys-coop:option/languageLiteracy, isce2569-infosys-regular:option/languageLiteracy, isne2566-coop:course, isne2566-coop:option/languageLiteracy, isne2566-regular:course, isne2566-regular:option/languageLiteracy
- `(none)` — override, used by: cpe2563-coop:course, cpe2563-regular:course

## 001225 English for Sci & Tech

Default (majority): `['001102']`

- `('001102',)` — **default**, used by: cpe2563-coop:course, cpe2563-coop:option/languageLiteracy, cpe2563-regular:course, cpe2563-regular:option/languageLiteracy, isne2566-coop:course, isne2566-coop:option/languageLiteracy, isne2566-regular:course, isne2566-regular:option/languageLiteracy
- `(none)` — override, used by: cpe2568-coop-s1:option/languageLiteracy, cpe2568-coop-s2:option/languageLiteracy, cpe2568-regular:option/languageLiteracy, isce2569-cysec-coop:option/languageLiteracy, isce2569-cysec-regular:option/languageLiteracy, isce2569-infosys-coop:option/languageLiteracy, isce2569-infosys-regular:option/languageLiteracy

## 261200 OOP

Default (majority): `['261102']`

- `('261102',)` — **default**, used by: cpe2563-coop:course, cpe2563-regular:course, cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course
- `('269102',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 261205 Data Struct & Algo

Default (majority): `['261102']`

- `('261102',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course
- `('269102',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 261212 Logic Lab

Default (majority): `['207106']`

- `('207106',)` — **default**, used by: cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course
- `(none)` — override, used by: cpe2563-coop:course, cpe2563-regular:course

## 261304 Comp Arch

Default (majority): `['261314']`

- `('261314',)` — **default**, used by: cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course
- `('261214',)` — override, used by: cpe2563-coop:course, cpe2563-regular:course

## 261305 OS

Default (majority): `['269210']`

- `('269210',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course
- `('261304',)` — override, used by: cpe2563-coop:course, cpe2563-regular:course, cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course

## 261335 Networks

Default (majority): `['269130']`

- `('269130',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course
- `('261332',)` — override, used by: cpe2563-coop:course, cpe2563-regular:course, cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course

## 261336 Networks Lab

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:course, cpe2563-regular:course, isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course
- `('261332',)` — override, used by: cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course

## 261341 Database Sys

Default (majority): `['261205']`

- `('261205',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course
- `('261218',)` — override, used by: cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course

## 261342 Database

Default (majority): `['261218']`

- `('261218',)` — **default**, used by: cpe2563-coop:course, cpe2563-regular:course
- `('261205',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 261361 Software Engr

Default (majority): `['261200']`

- `('261200',)` — **default**, used by: cpe2563-coop:course, cpe2563-regular:course, cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course, isne2566-coop:course, isne2566-regular:course
- `(none)` — override, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('269202',)` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course

## 261405 Advanced CPE

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective
- `('261361',)` — override, used by: cpe2563-coop:course, cpe2563-regular:course

## 261433 Network Prog

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective
- `('261335',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 261434 Net Design & Mgmt

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective, isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('261335',)` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course

## 261446 Info Sys

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective, isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('261205',)` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course

## 261447 Net & Info Sec

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective
- `('261335',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 261449 Software Testing

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective, isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective, isne2566-coop:option/majorElective, isne2566-regular:option/majorElective
- `('261361',)` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course

## 261452 Artificial Intelligence

Default (majority): `['208150', '261218']`

- `('208150', '261218')` — **default**, used by: cpe2568-coop-s1:course, cpe2568-coop-s2:course, cpe2568-regular:course
- `(none)` — override, used by: cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective

## 267345 AI & ML

Default (majority): `['261205']`

- `('261205',)` — **default**, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course
- `('269202',)` — override, used by: isce2569-cysec-coop:course
- `('255201', '261205')` — override, used by: isce2569-cysec-regular:course

## 267351 Ethical Hacking

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('267251',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267352 OS Security

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('261305',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267360 Defensive Security

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('267351',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267371 Pentest

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('267351',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267480 CSF

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('267360',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267481 DFIR

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('267351',)` — override, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course

## 267492 Project

Default (majority): `['267491']`

- `('267491',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-regular:course
- `(none)` — override, used by: isce2569-infosys-coop:course

## 269130 Data Comm

Default (majority): `['267101']`

- `('267101',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course
- `('269101',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 269370 Proj Mgmt for ISNE

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('261205',)` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course

## 269430 Wireless & Broadband

Default (majority): `['261335']`

- `('261335',)` — **default**, used by: isce2569-cysec-coop:course, isce2569-cysec-regular:course, isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course
- `(none)` — override, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective

## 269462 Intro to HCI

Default (majority): `(none)`

- `(none)` — **default**, used by: cpe2563-coop:option/majorElective, cpe2563-regular:option/majorElective, cpe2568-coop-s1:option/majorElective, cpe2568-coop-s2:option/majorElective, cpe2568-regular:option/majorElective
- `('261361',)` — override, used by: isne2566-coop:course, isne2566-regular:course

## 269470 ITSM

Default (majority): `(none)`

- `(none)` — **default**, used by: isce2569-cysec-coop:option/majorElective, isce2569-cysec-regular:option/majorElective, isce2569-infosys-coop:option/majorElective, isce2569-infosys-regular:option/majorElective
- `('261446', '269370')` — override, used by: isce2569-infosys-coop:course, isce2569-infosys-regular:course, isne2566-coop:course, isne2566-regular:course

