from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from backend.models.schemas import InvestigationReport


class PDFService:
    def render_report_pdf(self, report: InvestigationReport) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()

        story = [
            Paragraph("CasePilot AI - Investigation Report", styles["Title"]),
            Spacer(1, 12),
            Paragraph(f"<b>Case Category:</b> {report.category}", styles["Normal"]),
            Paragraph(f"<b>Confidence:</b> {report.confidence}", styles["Normal"]),
            Spacer(1, 12),
            Paragraph("<b>Executive Summary</b>", styles["Heading2"]),
            Paragraph(report.summary, styles["BodyText"]),
            Spacer(1, 10),
            Paragraph("<b>Incident Timeline</b>", styles["Heading2"]),
        ]

        if report.timeline:
            for item in report.timeline:
                story.append(Paragraph(f"- {item.date}: {item.event}", styles["BodyText"]))
        else:
            story.append(Paragraph("Additional information is required.", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Evidence Submitted</b>", styles["Heading2"]),
        ]
        for item in report.evidence:
            story.append(Paragraph(f"- {item.evidence}: {item.status}", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Potentially Relevant Legal Provisions</b>", styles["Heading2"]),
        ]
        for item in report.legal_provisions:
            story.append(
                Paragraph(
                    f"- {item.provision} ({item.confidence}): {item.explanation} "
                    f"Why it may apply: {item.why_it_may_apply}",
                    styles["BodyText"],
                )
            )

        story += [
            Spacer(1, 10),
            Paragraph("<b>Relevant Complaint Sections</b>", styles["Heading2"]),
        ]
        if hasattr(report, "complaint_sections") and report.complaint_sections:
            for item in report.complaint_sections:
                story.append(Paragraph(f"<b>{item.section}</b>: {item.explanation}", styles["BodyText"]))
        else:
            story.append(Paragraph("None identified.", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Written Complaint Draft</b>", styles["Heading2"]),
        ]
        if hasattr(report, "written_complaint_draft") and report.written_complaint_draft:
            formatted_draft = report.written_complaint_draft.replace("\n", "<br/>")
            story.append(Paragraph(formatted_draft, styles["BodyText"]))
        else:
            story.append(Paragraph("None generated.", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Missing Information</b>", styles["Heading2"]),
        ]
        for item in report.missing_information:
            story.append(Paragraph(f"- {item}", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Suggested Next Steps</b>", styles["Heading2"]),
        ]
        for item in report.next_steps:
            story.append(Paragraph(f"- {item}", styles["BodyText"]))

        story += [
            Spacer(1, 10),
            Paragraph("<b>Disclaimer</b>", styles["Heading2"]),
            Paragraph(report.disclaimer, styles["BodyText"]),
        ]

        doc.build(story)
        return buffer.getvalue()
