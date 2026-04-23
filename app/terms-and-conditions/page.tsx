// app/terms-and-conditions/page.tsx
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const metadata = {
  title: "Terms & Conditions · Rate My Teacher",
};

export default function TermsAndConditionsPage() {
  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center gap-3">
          <BackButton
            fallbackHref="/"
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50"
          >
            <span aria-hidden>←</span>
            Back
          </BackButton>
          <div className="text-xs text-neutral-500">Rate My Teacher · BIPH</div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight">Terms of Use</h1>
        <p className="mt-2 text-xs text-neutral-500">Last updated: January 20, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-7 text-neutral-800">
          {/* NOTICE */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="font-semibold">Important notice</p>
            <p className="mt-1 text-neutral-800">
              These Terms include an arbitration clause and a class action waiver. By using this Site, you agree that
              most disputes must be resolved through binding arbitration on an individual basis (not in court and not as
              a class action), except where prohibited by applicable law or where an opt-out is provided below.
            </p>
          </div>

          <p>
            This is the official Terms of Use Agreement (“Agreement”) for the <span className="font-semibold">Rate My Teacher-BIPH</span>{" "}
            website, application, or other interactive service (the “Site”). The Site is owned, operated and/or provided
            by the <span className="font-semibold">Molarity team</span> (“Rate My Teacher-BIPH,” “we,” “us,” or “our”).
          </p>

          {/* HIGHLIGHTS */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">Terms of Use Highlights</h2>
          <p>
            For convenience, the highlights below provide a quick summary of this Agreement. Please read the entire
            Agreement for details. If you have questions, please use the Site’s “Contact Us” option.
          </p>

          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className="font-semibold">Scope &amp; Eligibility:</span> The Site is intended for students of{" "}
              <span className="font-semibold">Basis International School Park Lane Harbour (BIPH)</span> to research and
              rate teachers/courses. Posting features require a Site account with a unique username and password.
            </li>
            <li>
              <span className="font-semibold">Rules &amp; Posting:</span> You are responsible for content you submit.
              Content must follow these Terms and the Site Guidelines. We may remove content that violates them.
            </li>
            <li>
              <span className="font-semibold">No Guarantees:</span> The Site is provided “as is” and “as available.”
              We do not guarantee availability, accuracy, or outcomes.
            </li>
            <li>
              <span className="font-semibold">Disputes:</span> Most disputes are resolved by binding arbitration and on
              an individual basis.
            </li>
          </ul>

          {/* 1 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">1. Eligibility; Additional Terms; Binding Agreement</h2>
          <p>
            The Site is designed as a student-focused forum for the BIPH community. By accessing or using the Site, you
            represent that you are eligible to do so and that you agree to be bound by this Agreement.
          </p>
          <p>
            <span className="font-semibold">School community requirement:</span> Features that allow posting (e.g., ratings,
            comments, likes/dislikes) are intended only for students who are currently enrolled in, or have previously
            attended, BIPH and who have taken the relevant class/teacher as applicable.
          </p>
          <p>
            <span className="font-semibold">Additional Terms:</span> The Site Guidelines and any posted rules or policies
            (including privacy and moderation practices) are incorporated into this Agreement by reference. If there is
            a conflict between these Terms and a specific policy for a feature, the specific policy governs for that
            feature.
          </p>

          {/* 2 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">2. Registration</h2>
          <p>
            Some features require you to create and maintain a Site account with a unique username and password. You
            agree to provide accurate information, keep your credentials secure, and use the Site responsibly. If you
            believe someone is abusing the Site or impersonating you, notify us promptly via “Contact Us.”
          </p>

          {/* 3 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">3. Modifications to this Agreement</h2>
          <p>
            We may update these Terms from time to time. Changes become effective when posted on the Site. Your continued
            use of the Site after changes are posted means you accept the updated Terms.
          </p>

          {/* 4 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">4. Ownership of Intellectual Property</h2>
          <p>
            The Site (including its design, software, text, graphics, and other content we provide) is owned by the
            Molarity team and/or its licensors and is protected by applicable intellectual property laws. You may use the
            Site only for your personal, non-commercial use for its intended purpose.
          </p>
          <p>
            You may not copy, modify, distribute, sell, or exploit any part of the Site or its content without our
            written permission, except as allowed by law.
          </p>

          {/* 5 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">5. Rules of Conduct</h2>
          <p>
            You agree not to use the Site in prohibited ways, including to harass, threaten, defame, or impersonate
            others; to share private information; to post hateful, discriminatory, obscene, or illegal content; to try
            to bypass security; or to interfere with the Site’s operation.
          </p>
          <p>
            You also agree not to scrape, crawl, or use automated tools to collect data from the Site without our prior
            written permission.
          </p>

          {/* 6 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">6. Postings; Moderation; License</h2>
          <p>
            The Site may allow you to submit ratings, comments, tags, or other materials (“Postings”). You are solely
            responsible for your Postings and the consequences of submitting them.
          </p>
          <p>
            <span className="font-semibold">Site Guidelines apply:</span> All Postings must comply with our Site
            Guidelines (including the “Prohibited Content” rules).
          </p>
          <p>
            <span className="font-semibold">Our right to remove content:</span> We may review, monitor, screen, remove,
            or refuse to publish any Posting at our discretion, including when we believe it violates these Terms or the
            Site Guidelines.
          </p>
          <p>
            <span className="font-semibold">License:</span> By submitting Postings, you grant Rate My Teacher-BIPH and
            the Molarity team a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display,
            distribute, and use your Postings in connection with operating, promoting, and improving the Site (including
            moderation and safety).
          </p>
          <p>
            <span className="font-semibold">Public display:</span> The Site is designed so ratings are presented without
            publicly showing the account username next to the rating. However, we may access limited internal submission
            metadata as needed for security, legal compliance, or moderation.
          </p>

          {/* 7 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">7. Deactivation / Termination</h2>
          <p>
            You may stop using the Site at any time. We may suspend or terminate your access at any time (with or without
            notice) if we believe you violated these Terms, the Site Guidelines, or used the Site in a harmful way.
          </p>

          {/* 8 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">8. Disclaimers</h2>
          <p className="uppercase font-semibold">
            The Site is provided “as is” and “as available” without warranties of any kind.
          </p>
          <p>
            We do not guarantee that the Site will be uninterrupted, error-free, secure, or available at any time. We
            do not endorse user Postings and are not responsible for opinions expressed by users.
          </p>

          {/* 9 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Rate My Teacher-BIPH and the Molarity team will not be liable for any
            indirect, incidental, consequential, special, or punitive damages arising out of or related to your use of
            the Site or these Terms.
          </p>

          {/* 10 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless Rate My Teacher-BIPH, the Molarity team, and their contributors from
            claims arising out of your Postings, your use of the Site, or your violation of these Terms or the Site
            Guidelines.
          </p>

          {/* 11 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">11. Privacy</h2>
          <p>
            Your use of the Site is also subject to our privacy practices. If a Privacy Policy page is provided on the
            Site, it is incorporated by reference into these Terms.
          </p>

          {/* 12 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">
            12. Resolution of Disputes; Binding Arbitration; No Class Actions
          </h2>
          <p className="font-semibold">
            Please read this section carefully. It affects your rights.
          </p>
          <p>
            Except where prohibited by applicable law, you and we agree that any dispute, claim, or controversy arising
            out of or relating to the Site or these Terms (a “Claim”) will be resolved by binding arbitration rather than
            in court, and only on an individual basis (not as a class, consolidated, or representative action).
          </p>
          <p>
            <span className="font-semibold">Opt-out (if you choose):</span> If we provide an opt-out option for arbitration
            / class action waiver, you must submit an opt-out notice within 45 days of first accepting these Terms, using
            the Site’s “Contact Us” option and clearly stating you wish to opt out of arbitration and the class action
            waiver. (We will record your request for our internal records.)
          </p>
          <p>
            <span className="font-semibold">Exceptions:</span> Either party may seek urgent injunctive relief in a court
            of competent jurisdiction to prevent immediate harm (for example, security abuse or unauthorized access),
            and then proceed to arbitration for the remainder of the Claim where applicable.
          </p>

          {/* 13 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">13. Governing Law; Venue</h2>
          <p>
            This Agreement is governed by the laws of the jurisdiction in which the Site is operated, without regard to
            conflict-of-laws principles, except where a different law must apply by statute. Where arbitration is not
            permitted by applicable law, disputes will be brought in the competent courts in that jurisdiction.
          </p>

          {/* 14 */}
          <h2 className="pt-2 text-lg font-extrabold tracking-tight">14. Miscellaneous</h2>
          <p>
            If any provision of this Agreement is found unenforceable, the remaining provisions remain in effect. This
            Agreement (together with the Site Guidelines and any other referenced policies) constitutes the entire
            agreement between you and us regarding the Site.
          </p>

          <div className="rounded-xl border bg-white px-4 py-3 text-xs text-neutral-600">
            <p className="font-semibold">Note</p>
            
          </div>
        </div>
      </div>
    </main>
  );
}
