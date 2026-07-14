-- Drop the email column from users. The corporate email used in PDFs lives in
-- src/config/company.ts (COMPANY.email), not on the User row, and login uses
-- `name` as the credential — email is not referenced anywhere after this.

ALTER TABLE "users" DROP COLUMN "email";
