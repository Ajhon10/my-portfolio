CREATE TABLE "photograph" (
 "id" UUID NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL, "deleted" BOOLEAN NOT NULL DEFAULT false, "deleted_at" TIMESTAMP(3),
 "title" VARCHAR(200) NOT NULL, "alt_text" VARCHAR(500) NOT NULL, "caption" TEXT NOT NULL DEFAULT '',
 "location" VARCHAR(200) NOT NULL DEFAULT '', "category" VARCHAR(100) NOT NULL DEFAULT 'Personal',
 "image_url" TEXT NOT NULL, "published" BOOLEAN NOT NULL DEFAULT false, "sort_order" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "photograph_pkey" PRIMARY KEY ("id")
);

INSERT INTO "project" ("id", "updated_at", "title", "slug", "description", "short_summary", "category", "featured", "published", "sort_order")
VALUES (gen_random_uuid(), CURRENT_TIMESTAMP, 'Designated Establishment Online Submission (DEOS)', 'designated-establishment-online-submission-deos', 'DEOS ? Designated Establishment Online Submission
WWC Yellow Bumblebee Corp. ? Fullstack contributor
Contributor: Jhon Lisley Jeresano

Contributed to the existing DEOS platform across its Vue frontend and NestJS backend as part of the development team.

My contributions
? Improved AEUR, AEECR, EAR, and designated-establishment forms, including validation, number formatting, submission states, and report layouts.
? Implemented and refined PDF generation, download behavior, pagination, and production report fixes.
? Improved spatial-analysis heatmaps, energy-consumption calculations, threshold filtering, and chart presentation.
? Added dashboard search and improved enterprise and establishment data display, ownership transfer, duplicate validation, and contact details.
? Built user-manual features on the client and server, including guidance content and seed data.
? Updated public content and FAQs, admin submission access, analytics integration, and client-requested interface improvements.

Attribution is based on commits authored by Jhon Lisley Jeresano in the DEOS client and server repositories. This is a team project; these are my contributions, not a claim of sole authorship.', 'Fullstack contributions to government energy reporting: submission forms, PDF reports, spatial analytics, and user guidance.', 'WWC Yellow Bumblebee Corp.', true, true, 0)
ON CONFLICT ("slug") DO UPDATE SET "description" = EXCLUDED."description", "short_summary" = EXCLUDED."short_summary", "category" = EXCLUDED."category", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "project" ("id", "updated_at", "title", "slug", "description", "short_summary", "category", "featured", "published", "sort_order")
VALUES (gen_random_uuid(), CURRENT_TIMESTAMP, 'PDEA Virtual Museum', 'pdea-virtual-museum', 'PDEA Virtual Museum
WWC Yellow Bumblebee Corp. ? Fullstack website developer
Developer: Jhon Lisley Jeresano

Built the complete website portion of the PDEA Virtual Museum, taking responsibility for its web interfaces and supporting website functionality.

My contributions
? Developed all website components and pages.
? Built the website?s frontend and backend functionality.
? Installed and integrated the Unity 3D application into the website so visitors could access the virtual museum experience.

Scope of ownership
The Unity 3D application itself was built by other developers. My responsibility covered the entire website and the installation and integration of that application into the web experience.', 'Built the complete museum website and integrated the separately developed Unity 3D museum experience.', 'WWC Yellow Bumblebee Corp.', true, true, 1)
ON CONFLICT ("slug") DO UPDATE SET "description" = EXCLUDED."description", "short_summary" = EXCLUDED."short_summary", "category" = EXCLUDED."category", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "project" ("id", "updated_at", "title", "slug", "description", "short_summary", "category", "featured", "published", "sort_order")
VALUES (gen_random_uuid(), CURRENT_TIMESTAMP, 'Office for Alternative Dispute Resolution (OADR)', 'office-for-alternative-dispute-resolution-oadr', 'Office for Alternative Dispute Resolution (OADR)
WWC Yellow Bumblebee Corp. ? Fullstack developer
Developer: Jhon Lisley Jeresano

Developed the complete recruitment process for OADR and contributed additional human-resources pages within the broader system.

My contributions
? Built the entire recruitment process and its supporting web functionality.
? Developed the performance management pages.
? Developed the awards and recognition pages.

Scope of ownership
My work covers the recruitment process and the named supporting pages. The wider OADR platform is a team project.', 'Developed the complete recruitment process and the performance management, awards, and recognition pages.', 'WWC Yellow Bumblebee Corp.', true, true, 2)
ON CONFLICT ("slug") DO UPDATE SET "description" = EXCLUDED."description", "short_summary" = EXCLUDED."short_summary", "category" = EXCLUDED."category", "updated_at" = CURRENT_TIMESTAMP;

INSERT INTO "site_content" ("id", "updated_at", "key", "label", "value") VALUES
(gen_random_uuid(), CURRENT_TIMESTAMP, 'hero_particle_density', 'Portrait character spacing (4?10)', '6'),
(gen_random_uuid(), CURRENT_TIMESTAMP, 'hero_particle_strength', 'Portrait hover strength (1?10)', '5')
ON CONFLICT ("key") DO NOTHING;
UPDATE "site_content" SET "value" = 'hi, Jhon here.', "updated_at" = CURRENT_TIMESTAMP WHERE "key" = 'hero_title' AND "value" = 'I am Jhon Lisley Jeresano';
UPDATE "site_content" SET "value" = 'I build for the web. From the first idea to the final interaction.', "updated_at" = CURRENT_TIMESTAMP WHERE "key" = 'hero_subtitle' AND "value" = 'a Fullstack Developer, Video Editor, and Photographer';
UPDATE "experience" SET "company" = 'WWC Yellow Bumblebee Corp.', "description" = 'Fullstack web development for DEOS, PDEA Virtual Museum, and OADR. Contributions include government reporting workflows, the complete PDEA museum website and Unity integration, and the OADR recruitment process, performance management, awards and recognition pages.', "updated_at" = CURRENT_TIMESTAMP WHERE "company" IN ('WWC Yellow Bumblebee', 'WWC Yellow Bumblebee Corp.') AND "deleted" = false;
