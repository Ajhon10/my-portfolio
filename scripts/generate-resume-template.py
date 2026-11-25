"""Rebuild the original free resume assets using only Python's standard library."""
from pathlib import Path
from xml.sax.saxutils import escape
from zipfile import ZipFile, ZIP_DEFLATED, ZipInfo

root = Path(__file__).resolve().parents[1] / "public" / "downloads"
root.mkdir(parents=True, exist_ok=True)

# Each entry is an ordinary paragraph, in the same reading order as the TXT file.
paragraphs = [
    ("name", "[YOUR NAME]"),
    ("body", "[City, Country] | [Phone number] | [Email address] | [LinkedIn or portfolio URL]"),
    ("heading", "PROFESSIONAL SUMMARY"),
    ("body", "[Target role] with experience in [relevant area]. Skilled in [skill 1], [skill 2] and [skill 3]. [Add a brief, truthful example of the value you bring.]"),
    ("heading", "SKILLS"),
    ("body", "Core skills: [Relevant skill 1], [Relevant skill 2], [Relevant skill 3]"),
    ("body", "Tools and technologies: [Tool 1], [Tool 2], [Tool 3]"),
    ("heading", "WORK EXPERIENCE"),
    ("bold", "[JOB TITLE] | [EMPLOYER] | [City, Country]"),
    ("body", "[Month Year] - [Month Year or Present]"),
    ("body", "- [Action verb] [specific responsibility or project] using [relevant skill or tool]."),
    ("body", "- [Describe an improvement or problem solved, including a measurable result if available.]"),
    ("body", "- [Describe collaboration, ownership or another achievement relevant to the role.]"),
    ("bold", "[PREVIOUS JOB TITLE] | [EMPLOYER] | [City, Country]"),
    ("body", "[Month Year] - [Month Year]"),
    ("body", "- [Describe a relevant contribution and its outcome.]"),
    ("body", "- [Describe another relevant responsibility or achievement.]"),
    ("heading", "PROJECTS"),
    ("bold", "[PROJECT NAME] | [TOOLS OR TECHNOLOGIES]"),
    ("body", "- [Explain what you built or delivered, your contribution and the result.]"),
    ("heading", "EDUCATION"),
    ("bold", "[DEGREE OR QUALIFICATION] | [INSTITUTION]"),
    ("body", "[City, Country] | [Graduation Month Year]"),
    ("heading", "CERTIFICATIONS"),
    ("body", "[Certification name] | [Issuing organization] | [Year]"),
]

def paragraph(kind, text):
    size = 40 if kind == "name" else 24 if kind == "heading" else 22
    bold = '<w:b/>' if kind in {"name", "heading", "bold"} else ''
    before = 180 if kind == "heading" else 0
    keep = '<w:keepNext/>' if kind in {"name", "heading", "bold"} else ''
    return (f'<w:p><w:pPr>{keep}<w:spacing w:before="{before}" w:after="60" w:line="240" w:lineRule="auto"/>'
            f'</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/>{bold}'
            f'<w:sz w:val="{size}"/><w:color w:val="000000"/></w:rPr>'
            f'<w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>')

document = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
            + ''.join(paragraph(kind, text) for kind, text in paragraphs)
            + '<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>'
            '<w:pgMar w:top="1008" w:right="1008" w:bottom="1008" w:left="1008"/>'
            '<w:cols w:num="1"/></w:sectPr></w:body></w:document>')
content_types = ('<?xml version="1.0" encoding="UTF-8"?>'
                 '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                 '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                 '<Default Extension="xml" ContentType="application/xml"/>'
                 '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
                 '</Types>')
relationships = ('<?xml version="1.0" encoding="UTF-8"?>'
                 '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                 '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
                 '</Relationships>')

def archive(path, entries):
    with ZipFile(path, 'w') as bundle:
        for name, data in entries.items():
            info = ZipInfo(name, (2026, 11, 25, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, data.encode('utf-8') if isinstance(data, str) else data)

docx = root / 'ats-friendly-resume-template.docx'
archive(docx, {'[Content_Types].xml': content_types, '_rels/.rels': relationships, 'word/document.xml': document})
plain = '\n'.join(text for _, text in paragraphs) + '\n'
(root / 'ats-friendly-resume-template.txt').write_text(plain, encoding='utf-8', newline='\n')
instructions = '''FREE RESUME TEMPLATE

1. Open the DOCX in Word, LibreOffice or Google Docs, or edit the TXT copy.
2. Replace every bracketed placeholder with your own information. Remove unused sections.
3. Put your most recent experience first. For an early-career resume, move Education higher if appropriate.
4. Describe your actual contributions. Use relevant terms from the job description when they accurately describe your experience.
5. Keep contact details in the main document body. Keep the single-column layout and standard headings.
6. Follow the employer's requested file type. Review any fields filled automatically after uploading.
7. Name your submitted file with your name, for example YourName-Resume.docx.

The DOCX uses Arial, black body text, ordinary paragraphs and standard headings.
There are no tables, columns, text boxes, pictures, icons, headers or footers containing resume information.
You may use and adapt this original template for personal and professional applications at no charge.

Formatting references:
https://career.d.umn.edu/students/resume-cover-letter/applicant-tracking-system-ats-tips
https://careerdesign.dartmouth.edu/resources/beat-the-bots-understanding-applicant-tracking-systems/
'''
(root / 'README-resume-template.txt').write_text(instructions, encoding='utf-8', newline='\n')
archive(root / 'ats-friendly-resume-template.zip', {docx.name: docx.read_bytes(), 'ats-friendly-resume-template.txt': plain, 'README.txt': instructions})
print('Generated editable DOCX, matching TXT, instructions and free download ZIP.')
