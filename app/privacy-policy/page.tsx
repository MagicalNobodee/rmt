// app/privacy-policy/page.tsx
import Link from "next/link";
import BackButton from "@/components/BackButton";

export const metadata = {
  title: "Privacy Policy · Rate My Teacher",
};

export default function PrivacyPolicyPage() {
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

        <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-xs text-neutral-500">Effective: January 20, 2026</p>

        <div className="mt-6 space-y-6 text-sm leading-7 text-neutral-800">
          <p className="font-semibold">RATE MY TEACHER-BIPH PRIVACY POLICY</p>

          <p className="font-semibold">PRIVACY POLICY AND CERTAIN RESIDENTS: NOTICE OF PRIVACY RIGHTS</p>

          <p>
            This is the privacy policy (“Privacy Policy”) describing our privacy practices for the{" "}
            <span className="font-semibold">Rate My Teacher-BIPH</span> website, applications, and other interactive
            services (the “Site”). The Site is owned, operated and/or provided by the{" "}
            <span className="font-semibold">Molarity team</span> (“Rate My Teacher-BIPH,” “we,” “us,” or “our”). This
            Privacy Policy is intended to explain our privacy practices and covers the following areas:
          </p>

          <ul className="list-disc space-y-1 pl-6">
            <li>When This Privacy Policy Applies.</li>
            <li>Governing Law.</li>
            <li>What Information Is Collected.</li>
            <li>How Collected Information Is Used.</li>
            <li>Your Choices.</li>
            <li>[reserved]</li>
            <li>Sharing and Disclosure of Information.</li>
            <li>Reviewing, Updating or Deleting Certain Information.</li>
            <li>Protection of Information.</li>
            <li>Notice of Privacy Rights (if applicable).</li>
            <li>Changes to this Privacy Policy.</li>
            <li>Miscellaneous.</li>
          </ul>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">1. When This Privacy Policy Applies</h2>
          <p>This Privacy Policy applies:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              Regardless of whether you access the Site via a personal computer, mobile device, or any other technology
              (each, a “Device”);
            </li>
            <li>
              Whether you access the Site as a registered user (if offered) or as an unregistered visitor;
            </li>
            <li>To all information (“Information”) collected by the Site;</li>
            <li>
              To our use of combined information if we combine Information collected through the Site with other
              information we receive in limited ways (for example, administrative or technical logs); and
            </li>
            <li>
              Even if your use of the Site or any feature ends, expires, is suspended, or is deactivated for any reason.
            </li>
          </ul>

          <p>
            This Privacy Policy does not apply to information collected by other companies or websites you may access
            via links from our Site, or to services not owned/operated by the Molarity team.
          </p>

          <p>
            By using the Site or its features, you consent to our privacy practices as described in this Privacy Policy.
          </p>

          <p>
            Certain products or services offered by the Site may have additional privacy statements (“Additional Privacy
            Statements”). If provided, those statements are incorporated by reference. If there is a conflict, the
            Additional Privacy Statement controls for that specific feature.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">2. Governing Law</h2>
          <p>
            Rate My Teacher-BIPH is a school-focused service intended for use by the{" "}
            <span className="font-semibold">BIPH</span> community. The Site may be hosted using third-party
            infrastructure providers (for example, Supabase and hosting providers) and data may be processed where those
            providers operate. If you access the Site from outside the hosting region, you do so at your own risk and
            you are responsible for complying with your local laws.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">3. What Information Is Collected</h2>

          <h3 className="text-base font-bold">3.1 Information You Provide</h3>
          <p>
            <span className="font-semibold">3.1.1 Account and Submissions:</span> When you create an account, we collect
            your chosen username and password through our authentication provider. When you submit ratings, tags,
            comments, or support tickets, we collect the content you provide. We do not ask for sensitive personal
            identifiers such as government ID numbers.
          </p>

          <p>
            <span className="font-semibold">3.1.2 In Connection with Site Features:</span> When you post ratings, tags,
            or comments, we collect the content you submit. The Site is designed so posted ratings are shown to other
            users without displaying your account name publicly alongside the rating.
          </p>

          <h3 className="text-base font-bold">3.2 Information Collected Automatically</h3>
          <p>
            Like most sites, we may collect certain technical information automatically, such as IP address, device and
            browser type, operating system, timestamps, pages viewed, and basic diagnostic logs. We may use cookies or
            similar technologies to preserve sign-in state, enforce one account creation per browser, and support core
            Site functionality.
          </p>

          <p>
            We do <span className="font-semibold">not</span> intentionally use the Site for cross-site behavioral
            advertising. If we ever introduce analytics or advertising partners that use tracking technologies, we will
            update this Privacy Policy accordingly and, where required, provide choices/opt-outs.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">4. How Collected Information Is Used</h2>
          <p>We use Information in a variety of ways, including:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>To enable Site features (posting, browsing, sorting, and displaying teacher/course pages);</li>
            <li>To enforce Site Guidelines and keep the community safe;</li>
            <li>To respond to support requests and administer the Site;</li>
            <li>To monitor performance, prevent abuse, and improve the Site.</li>
          </ul>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">5. Your Choices</h2>
          <p>
            <span className="font-semibold">Posting:</span> You can browse without signing in. If you want to post a
            rating, vote, comment, or ticket, you need to sign in with an account. Content you submit may be retained
            for moderation, safety, and support.
          </p>
          <p>
            <span className="font-semibold">Cookies:</span> Most browsers let you control cookies. Disabling cookies may
            affect sign-in state, the browser-level signup limit, and other core functionality.
          </p>
          <p>
            <span className="font-semibold">Content:</span> If you post a rating/comment, you can usually manage or
            remove it using Site features where available, subject to moderation and integrity safeguards.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">6. [Reserved]</h2>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">7. Sharing and Disclosure of Information</h2>
          <p>We may disclose Information in the following circumstances:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className="font-semibold">Operational service providers:</span> We use third-party providers to host
              and operate the Site (for example, authentication, database, and hosting). These providers process data on
              our behalf under appropriate safeguards.
            </li>
            <li>
              <span className="font-semibold">Safety, security, and compliance:</span> If required by law, school policy,
              or to protect users and the Site, we may disclose information to appropriate authorities or school
              leadership (for example, credible threats of violence or harm).
            </li>
            <li>
              <span className="font-semibold">Business changes:</span> In the event of a reorganization, migration, or
              transfer of the Site to another operator, information may be transferred as part of that change, subject
              to applicable law and this policy.
            </li>
          </ul>

          <p className="font-semibold">Public display:</p>
          <p>
            Ratings and comments are user-generated. They may be shown publicly within the Site. The Site is designed so
            the author identity is not displayed alongside ratings, but moderators may access limited internal metadata
            for safety, abuse prevention, and enforcement of Site Guidelines.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">8. Reviewing, Updating or Deleting Certain Information</h2>
          <p>
            You may request deletion of information you submitted by contacting us (see Section 13). Some information
            may be retained for safety, abuse prevention, legal compliance, or to maintain the integrity of the service.
          </p>

          <p>
            Please note: deleting a submission may not necessarily remove all related records if retention is required
            for moderation, safety, or compliance reasons; however, we will handle requests thoughtfully and in line
            with the Site’s mission and obligations.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">9. Protection of Information</h2>
          <p>
            We maintain commercially reasonable administrative, technical, and organizational safeguards to protect
            Information. However, no system is 100% secure. Please use caution when sharing information and avoid posting
            private contact details about yourself or others.
          </p>

          <div className="rounded-xl border bg-white px-4 py-3">
            <p className="font-semibold">Phishing notice</p>
            <p className="mt-1 text-sm text-neutral-700">
              We do not send emails asking you to provide or confirm passwords. If you receive a suspicious email
              claiming to be from Rate My Teacher-BIPH, do not click links and report it to school IT/support.
            </p>
          </div>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">10. Notice of Privacy Rights (If Applicable)</h2>
          <p>
            Some jurisdictions provide privacy rights such as access, correction, deletion, and opting out of certain
            processing. Because this Site is a small, school-focused service and collects limited data, some rights may
            be fulfilled by contacting us. We will make reasonable efforts to honor applicable requests consistent with
            the Site’s purpose, safety, and legal obligations.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">11. Changes to this Privacy Policy</h2>
          <p>
            We may revise this Privacy Policy at any time by posting an updated version on the Site. Changes are
            effective immediately upon posting. Your continued use of the Site after changes are posted indicates your
            acceptance of the updated policy.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">12. Miscellaneous</h2>
          <p>
            Please review the Terms of Use, which governs your use of the Site. If any term is not defined in this
            Privacy Policy, it has the meaning provided in the Terms of Use.
          </p>

          <h2 className="pt-2 text-lg font-extrabold tracking-tight">13. Questions / Contact</h2>
          <p>
            If you have questions about this Privacy Policy or would like to make a privacy-related request, please use
            the Site’s “Contact Us” option (if provided). If an email contact is provided by the Site operator, you may
            also contact the <span className="font-semibold">Molarity team</span> through that channel.
          </p>

          <div className="rounded-xl border bg-white px-4 py-3 text-xs text-neutral-600">
            <p className="font-semibold">Note</p>
            
          </div>
        </div>
      </div>
    </main>
  );
}
