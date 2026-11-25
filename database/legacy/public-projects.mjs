export const portfolioProjects = [
	{
		slug: 'designated-establishment-online-submission-deos',
		title: 'Designated Establishment Online Submission (DEOS)',
		shortSummary:
			'Fullstack contributions to government energy reporting: submission forms, PDF reports, spatial analytics, and user guidance.',
		description:
			'DEOS - Designated Establishment Online Submission\nWWC Yellow Bumblebee Corp. - Fullstack contributor\nContributor: Jhon Lisley Jeresano\n\nContributed to the existing DEOS platform across its Vue frontend and NestJS backend as part of the development team.\n\nMy contributions\n- Improved AEUR, AEECR, EAR, and designated-establishment forms, including validation, number formatting, submission states, and report layouts.\n- Implemented and refined PDF generation, download behavior, pagination, and production report fixes.\n- Improved spatial-analysis heatmaps, energy-consumption calculations, threshold filtering, and chart presentation.\n- Added dashboard search and improved enterprise and establishment data display, ownership transfer, duplicate validation, and contact details.\n- Built user-manual features on the client and server, including guidance content and seed data.\n- Updated public content and FAQs, admin submission access, analytics integration, and client-requested interface improvements.\n\nAttribution is based on commits authored by Jhon Lisley Jeresano in the DEOS client and server repositories. This is a team project; these are my contributions, not a claim of sole authorship.',
		category: 'WWC Yellow Bumblebee Corp.',
		featured: true,
		published: true,
		sortOrder: 0,
	},
	{
		slug: 'pdea-virtual-museum',
		title: 'PDEA Virtual Museum',
		shortSummary:
			'Built the complete museum website and integrated the separately developed Unity 3D museum experience.',
		description:
			"PDEA Virtual Museum\nWWC Yellow Bumblebee Corp. - Fullstack website developer\nDeveloper: Jhon Lisley Jeresano\n\nBuilt the complete website portion of the PDEA Virtual Museum, taking responsibility for its web interfaces and supporting website functionality.\n\nMy contributions\n- Developed all website components and pages.\n- Built the website's frontend and backend functionality.\n- Installed and integrated the Unity 3D application into the website so visitors could access the virtual museum experience.\n\nScope of ownership\nThe Unity 3D application itself was built by other developers. My responsibility covered the entire website and the installation and integration of that application into the web experience.",
		category: 'WWC Yellow Bumblebee Corp.',
		featured: true,
		published: true,
		sortOrder: 1,
	},
	{
		slug: 'office-for-alternative-dispute-resolution-oadr',
		title: 'Office for Alternative Dispute Resolution (OADR)',
		shortSummary:
			'Developed the complete recruitment process and the performance management, awards, and recognition pages.',
		description:
			'Office for Alternative Dispute Resolution (OADR)\nWWC Yellow Bumblebee Corp. - Fullstack developer\nDeveloper: Jhon Lisley Jeresano\n\nDeveloped the complete recruitment process for OADR and contributed additional human-resources pages within the broader system.\n\nMy contributions\n- Built the entire recruitment process and its supporting web functionality.\n- Developed the performance management pages.\n- Developed the awards and recognition pages.\n\nScope of ownership\nMy work covers the recruitment process and the named supporting pages. The wider OADR platform is a team project.',
		category: 'WWC Yellow Bumblebee Corp.',
		featured: true,
		published: true,
		sortOrder: 2,
	},
	{
		slug: 'sss-archive-v2',
		title: 'SSS Archive v2',
		shortSummary:
			'An offline Windows archive workspace with connected classifications, document management, local AI/OCR assistance, and reviewable database transfers.',
		description:
			'SSS Archive v2 / SSS Records\n\nAn offline-first Windows desktop application for organizing archive records and their supporting documents. Each computer keeps its own local SQLite workspace, with no internet connection required for normal use.\n\nImplemented features\n- Connected GRDS and SSS RDS classification trees, searchable archive registers, and record forms that preserve saved classification and retention details.\n- Supporting-document storage and previews, received-date dashboards, and PDF, Excel, CSV, and print reports.\n- Bundled local AI and OCR assistance for preparing record drafts and finding records, with human review before saving.\n- Reviewable database transfers between computers, conflict handling, recovery snapshots, and encrypted full-workspace backups.\n- Light/dark appearance and accessibility settings for text size, contrast, controls, and reduced motion.\n\nTechnology: Vue 3, TypeScript, Electron, Node.js, SQLite, and Tesseract.js.\n\nPlatform: Windows desktop. This is the standalone version 2 project, separate from the original version 1 application.',
		repoUrl: 'https://github.com/Ajhon10/SSS-archive-v2',
		category: 'Desktop Application',
		featured: true,
		published: true,
		sortOrder: 3,
	},
	{
		slug: 'kikos-order-planner',
		title: "Kiko's Order Planner",
		shortSummary:
			'An internal food-order planner with customer contacts, fulfillment calendars, preparation tracking, payment records, and operational reports.',
		description:
			"Kiko's Order Planner\n\nAn internal web application for organizing food orders from booking through preparation and handoff. Owner and Staff permissions separate daily operations from account, menu, payment, cancellation, and financial-report administration.\n\nImplemented features\n- Customer contacts and order creation, editing, drafts, duplication, filtering, and preparation history.\n- Month, week, and day calendars with daily agendas for delivery and pickup schedules.\n- Payment/refund records, balances, and role-based dashboard summaries.\n- Operational and financial reports with PDF, Excel, CSV, and print exports.\n- Opt-in offline order/calendar access and queued order changes that synchronize after reconnecting.\n- Responsive desktop and mobile layouts, staff profiles, and recorded action attribution.\n\nTechnology: Vue 3, TypeScript, Laravel, PHP, and Tailwind CSS. MySQL is the production database target.\n\nStatus: implemented and locally verified. Production hosting and live business acceptance remain pending; no public application URL is listed.",
		category: 'Web Application',
		featured: true,
		published: true,
		sortOrder: 4,
	},
	{
		slug: 'blank-personal-finance',
		title: 'Blank',
		shortSummary:
			'A local-first personal finance desktop app for accounts, income and expenses, transfers, budgets, goals, receipts, and financial insights.',
		description:
			'Blank / Personal Finance Tracker\n\nA Windows-first desktop application for managing personal finances in a local workspace. Its interface combines customizable wallet cards, clear financial summaries, and a Liquid Glass visual style.\n\nImplemented features\n- Bank, e-wallet, and cash account sections with customizable card appearance and arrangement.\n- Income and expense entries, transfers, recurring income receipts, and editable categories.\n- Planned payments, receivables, debts, category budgets, and savings goals.\n- Image/PDF receipts, reports, dashboard charts, balance reminders, and local Tarsi backup import.\n- Profile customization, multiple appearance themes, and a packaged Windows installer.\n\nTechnology: React, TypeScript, Tauri 2, Rust, SQLite, and Recharts.\n\nPlatform: Windows desktop. Web and mobile clients are planned; this entry does not present them as released applications.',
		category: 'Desktop Application',
		featured: true,
		published: true,
		sortOrder: 5,
	},
]
