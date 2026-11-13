import { useEffect } from "react";
import { ArrowLeft, FileText, Mail, Phone } from "lucide-react";
import { BUSINESS } from "@/data/site";
import { mailtoHref, telHref, whatsappHref } from "@/lib/contact";
import { navigate } from "@/lib/router";
import { Button } from "./ui/Button";
import { Logo } from "./ui/Logo";

export type PolicyKind = "terms" | "privacy" | "refund";

type Section = { heading: string; paragraphs: string[]; items?: string[] };

const CONTACT_LINE = `${BUSINESS.phoneDisplay} or ${BUSINESS.email}`;

const POLICIES: Record<PolicyKind, { title: string; eyebrow: string; description: string; sections: Section[] }> = {
  terms: {
    title: "Terms and Conditions",
    eyebrow: "Atrocity Gaming",
    description: "Terms for booking and using gaming sessions at Atrocity Gaming Lounge.",
    sections: [
      { heading: "1. Acceptance of Terms", paragraphs: ["By using this website, making a booking, or visiting the lounge for a booked session, you agree to these Terms and Conditions and the applicable policies linked below."] },
      { heading: "2. Services and Gaming Packages", paragraphs: ["Atrocity Gaming provides time-based console gaming sessions, walk-in services, online booking, and, where offered, events and tournaments at its physical lounge in Kavindapadi, Erode."], items: ["Gaming sessions are delivered at the lounge; no physical products are shipped.", "Packages, availability, game selection, and prices may vary by console, date, and service."] },
      { heading: "3. Booking and Availability", paragraphs: ["A booking is subject to availability and is confirmed only after the booking and applicable payment status are recorded by the system or lounge. We may contact you if a requested slot cannot be provided." ] },
      { heading: "4. User Responsibilities", paragraphs: ["You must provide accurate booking details, use the lounge responsibly, follow staff instructions, and not damage equipment or disrupt other guests." ] },
      { heading: "5. Account Registration and Security", paragraphs: ["Customer bookings do not require a customer account. Staff and administrator access is restricted to authorised personnel, who are responsible for keeping their credentials confidential." ] },
      { heading: "6. Payments and Pricing", paragraphs: ["Prices are shown in INR. Where online payment is available, payments are initiated through the payment gateway displayed at checkout and are subject to payment verification. We do not store complete card details, UPI PINs, or banking passwords on our own systems." ] },
      { heading: "7. Booking Duration and Session Rules", paragraphs: ["A fixed package determines the booked duration. Its duration cannot be increased or decreased unless the website explicitly offers another booking option. Your reservation has a fixed start and end time."], items: ["Please arrive according to the confirmed schedule.", "Late arrival does not extend the session. For example, a 12:00 PM–1:00 PM booking that begins at 12:30 PM still ends at 1:00 PM."] },
      { heading: "8. Cancellation and Refunds", paragraphs: ["A cancellation requested at least 1 hour before the scheduled session is eligible for a refund of 80% of the amount paid; the remaining 20% is retained. A cancellation requested less than 1 hour before the session is normally not eligible for a refund, although an exceptional minimal refund may be considered at the lounge's discretion and is not guaranteed.", "A customer who has paid but does not arrive for their scheduled session is eligible for a refund of 80% of the amount paid. The remaining 20% is retained. Refund requests must include sufficient booking and payment information for verification. Please refer to the Refund and Cancellation Policy for instructions on requesting a refund." ] },
      { heading: "9. Gaming Equipment and Lounge Rules", paragraphs: ["Equipment remains the property of Atrocity Gaming. Guests must use it with reasonable care. We may end a session for unsafe, unlawful, abusive, or disruptive conduct." ] },
      { heading: "10. Intellectual Property", paragraphs: ["The Atrocity Gaming name, website content, branding, and original materials may not be copied or used without permission. Game titles and third-party marks belong to their respective owners." ] },
      { heading: "11. Third-Party Services and Links", paragraphs: ["The website may link to the payment provider, WhatsApp, Google Maps, or other third-party services. Their terms and privacy practices apply when you use those services." ] },
      { heading: "12. Service Interruptions and Technical Issues", paragraphs: ["Gaming availability can be affected by equipment, network, power, or operational issues. If a confirmed service cannot be provided, we will review the circumstances under the Refund and Cancellation Policy." ] },
      { heading: "13. Limitation of Liability", paragraphs: ["To the extent permitted by applicable law, Atrocity Gaming is not responsible for indirect or consequential loss arising from use of the website or lounge. This does not limit rights that cannot legally be excluded." ] },
      { heading: "14. Changes to Terms", paragraphs: ["We may update these Terms when our services or legal requirements change. Updated Terms take effect when posted on this website." ] },
      { heading: "15. Governing Law and Jurisdiction", paragraphs: ["These Terms are governed by applicable laws of India. Subject to applicable law, disputes are subject to the courts with appropriate jurisdiction over the lounge location." ] },
      { heading: "16. Contact Information", paragraphs: [`For questions, contact the lounge at ${CONTACT_LINE}, or visit us during operating hours.`] },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    eyebrow: "Atrocity Gaming",
    description: "How booking, payment, and website information is handled by Atrocity Gaming.",
    sections: [
      { heading: "1. Information We Collect", paragraphs: ["For a booking, we collect and store the customer's name, normalized mobile number, booking date and time, console and package selection, duration, bonus time, price, booking code, selected game, player count, optional notes, booking and payment status, booking source, and relevant timestamps. Online console bookings do not currently submit or store a customer email address.", "Authorised staff accounts include authentication and role-related information needed to operate the staff and administrator portals." ] },
      { heading: "2. How We Use Information", paragraphs: ["We use this information to create and manage bookings, check availability, communicate about a session, support customers, operate the lounge, prevent misuse, and meet applicable legal obligations." ] },
      { heading: "3. Booking and Transaction Information", paragraphs: ["Payment records include the payment amount, payment status, receipt or transaction reference, online payment provider order IDs, and online payment provider payment IDs. These records are used to confirm payments, investigate issues, and maintain operational records." ] },
      { heading: "4. Payment Processing", paragraphs: ["The payment provider processes online payments and maintains its own payment-side transaction information. Atrocity Gaming does not store complete card numbers, UPI PINs, or banking passwords on its own systems." ] },
      { heading: "5. Staff Authentication and Browser Storage", paragraphs: ["Browser storage is used to maintain authentication sessions for authorised staff and administrators. This is separate from customer booking functionality. Staff authentication accounts are managed through Supabase Auth."] },
      { heading: "6. Cookies and Third-Party Services", paragraphs: ["The website has no first-party analytics implementation, advertising SDK, tracking pixel, or cookie-consent or tracking implementation. The website loads or links to the payment gateway when available, Google Fonts, Google Maps, and WhatsApp. These third-party providers may apply their own privacy and data-handling policies when you use their services." ] },
      { heading: "7. Data Sharing", paragraphs: ["Information is shared only where needed to provide the service, process payments, operate the authorised systems described in this policy, comply with law, or protect the lounge, customers, and staff. We do not sell customer personal information." ] },
      { heading: "8. Data Storage and Security", paragraphs: ["Supabase PostgreSQL stores booking, group-booking, tournament-registration, payment, staff, and audit data. Supabase Auth stores staff authentication accounts. Supabase Storage stores uploaded media, not booking records. The payment provider processes online payments and holds payment-side transaction information." ] },
      { heading: "9. Data Retention", paragraphs: ["We retain booking, payment, and staff information only as long as reasonably necessary for service delivery, support, record-keeping, dispute handling, and applicable legal obligations." ] },
      { heading: "10. Customer Privacy Rights", paragraphs: ["You may ask to review, correct, or request deletion of personal information, subject to applicable law and records we must retain. Requests can be sent using the contact details below." ] },
      { heading: "11. Children's Privacy", paragraphs: ["If a minor uses the lounge, a parent or guardian should make or supervise the booking. We do not knowingly seek to collect more personal information from children than is necessary to provide the requested service." ] },
      { heading: "12. Policy Updates", paragraphs: ["We may update this policy to reflect changes in our services or applicable requirements. The current version will be posted on this website." ] },
      { heading: "13. Contact Information", paragraphs: [`For privacy requests or questions, contact Atrocity Gaming at ${CONTACT_LINE}, or visit the lounge during operating hours.`] },
    ],
  },
  refund: {
    title: "Refund and Cancellation Policy",
    eyebrow: "Atrocity Gaming",
    description: "Cancellation, late-arrival, payment-issue, and refund-request information for time-based gaming sessions.",
    sections: [
      { heading: "1. Cancellation at Least One Hour Before the Session", paragraphs: ["Customers must request cancellation at least 1 hour before the scheduled gaming session. An eligible cancellation receives a refund of 80% of the amount paid, with the remaining 20% retained. For example, a booking scheduled at 5:00 PM must be requested for cancellation no later than 4:00 PM. The website does not provide an automatic cancellation or refund mechanism." ] },
      { heading: "2. Cancellation Less Than One Hour Before the Session", paragraphs: ["A cancellation request made less than 1 hour before the scheduled session is normally not eligible for a refund. Atrocity Gaming may consider a minimal or exceptional refund depending on the circumstances, but no refund amount is guaranteed." ] },
      { heading: "3. No-Show Refunds", paragraphs: ["A customer who has paid but does not arrive for their scheduled session is eligible for a refund of 80% of the amount paid. The remaining 20% is retained.","To request a refund, contact the lounge by phone, email, or WhatsApp. Provide your name, booking date and time, booking code if available, payment amount, and transaction reference so that we can verify the booking and payment." ] }, 
      { heading: "4. Late Arrival", paragraphs: ["Please arrive on time. Late arrival does not change the confirmed end time or create a right to extra time. For example, if a 12:00 PM–1:00 PM session begins at 12:30 PM, only the remaining 30 minutes are available." ] },
      { heading: "5. Other Refund Eligibility", paragraphs: ["Eligible requests may be reviewed where there is a duplicate payment, an incorrect charge, money deducted without a confirmed booking, a confirmed service cancelled by Atrocity Gaming, lounge unavailability after confirmation, or a technical issue that prevents the booked service from being provided. Rights available under applicable consumer-protection law are not limited by this policy." ] },
      { heading: "6. Failed or Pending Transactions", paragraphs: ["If money is deducted but no confirmation is received, a payment remains pending, a transaction fails, or a successful payment is not reflected, contact the lounge before making another payment where possible. Share your name, booking details, amount, date and time, payment method, and order or transaction reference so the payment can be investigated." ] },
      { heading: "7. Refund Review and Processing", paragraphs: ["Refund requests are reviewed against booking and payment records. We will communicate the decision after verification. Where a refund is approved, it will be returned through the original payment method where reasonably possible. Processing time may depend on the payment provider and the customer's bank or payment service. No specific processing time is guaranteed by this policy." ] },
      { heading: "8. Cancellation by Atrocity Gaming", paragraphs: ["If the lounge cannot provide a confirmed session because of an operational, technical, or availability issue, we will contact you using the available booking details and review the appropriate remedy, including an eligible refund for an undelivered paid service." ] },
      { heading: "9. Policy Changes and Contact", paragraphs: [`We may update this policy subject to applicable law. For cancellation or refund assistance, contact the lounge at ${CONTACT_LINE}, or visit Atrocity Gaming Lounge directly during operating hours.`] },
    ],
  },
};

const POLICY_LINKS: { kind: PolicyKind; label: string; href: string }[] = [
  { kind: "terms", label: "Terms & Conditions", href: "/terms-and-conditions" },
  { kind: "privacy", label: "Privacy Policy", href: "/privacy-policy" },
  { kind: "refund", label: "Refund & Cancellation", href: "/refund-policy" },
];

export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const policy = POLICIES[kind];

  useEffect(() => {
    document.title = `${policy.title} | ${BUSINESS.name}`;
    window.scrollTo({ top: 0 });
  }, [policy.title]);

  return (
    <main className="min-h-screen bg-black pb-16 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button type="button" onClick={() => navigate("/")} className="rounded-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blood">
            <Logo />
          </button>
          <Button variant="outline" size="sm" onClick={() => navigate("/")}><ArrowLeft /> Home</Button>
        </div>
      </header>

      <div className="relative isolate overflow-hidden border-b border-white/10 bg-[#080001]">
        <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blood/15 blur-[110px]" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <FileText className="mx-auto h-9 w-9 text-blood" />
          <p className="mt-5 font-tech text-xs font-bold uppercase tracking-[0.3em] text-blood-300">{policy.eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">{policy.title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/65 sm:text-lg">{policy.description}</p>
        </div>
      </div>

      <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="space-y-8">
          {policy.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 sm:p-7">
              <h2 className="font-display text-lg font-black uppercase tracking-wide text-white sm:text-xl">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph} className="mt-4 text-sm leading-7 text-white/70 sm:text-base">{paragraph}</p>)}
              {section.items && <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-white/70 sm:text-base">{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
            </section>
          ))}
        </div>

        <aside className="mt-10 rounded-2xl border border-blood/35 bg-blood/[0.07] p-6 text-center">
          <h2 className="font-display text-lg font-black uppercase tracking-wide">Need help?</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/70">Call, email, WhatsApp, or visit the lounge during operating hours.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button size="sm" href={telHref}><Phone /> Call the Lounge</Button>
            <Button size="sm" variant="outline" href={mailtoHref}><Mail /> Email Us</Button>
            <Button size="sm" variant="outline" href={whatsappHref("Hi Atrocity Gaming Lounge, I need help with my booking or refund request.")} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
          </div>
        </aside>

        <nav aria-label="Policy pages" className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm">
          {POLICY_LINKS.map((link) => <a key={link.href} href={link.href} onClick={(event) => { event.preventDefault(); navigate(link.href); }} className={link.kind === kind ? "font-bold text-blood-300" : "text-white/60 transition-colors hover:text-white"}>{link.label}</a>)}
          <a href="/#contact" className="text-white/60 transition-colors hover:text-white">Contact the Lounge</a>
        </nav>
      </article>
    </main>
  );
}
