import LegalDocument from '../../Components/LegalDocument';

const sections = [
    {
        title: 'Scope and responsible handling',
        content: [
            'This notice explains in understandable terms how the AgriFarm thesis project handles personal information. The project aims to follow principles of transparency, legitimate purpose, and proportionality reflected in the Philippine Data Privacy Act of 2012 and its implementing rules. This statement does not claim legal certification or regulatory approval.',
        ],
    },
    {
        title: 'Information collected',
        content: ['Depending on the features used during approved testing, AgriFarm may collect:'],
        items: [
            'account information such as full name, email address, assigned role, verification state, and legal-acceptance timestamps;',
            'security records such as encrypted passwords, hashed one-time-code records, session information, login attempts, and technical logs;',
            'transaction or prototype-order information such as selected products, quantities, prices, status, and involved accounts if those features are later enabled;',
            'seller-supplied listing information and communications entered into the prototype;',
            'device, browser, approximate network, error, and usage information reasonably needed to operate, secure, test, and improve the system.',
        ],
    },
    {
        title: 'Why information is used',
        content: [
            'Information is used to create and verify accounts, authenticate users, enforce role permissions, send necessary account messages, support authorized prototype workflows, prevent abuse, diagnose errors, evaluate usability and thesis objectives, and meet legitimate academic or institutional requirements.',
            'AgriFarm does not require real payment credentials for this prototype and users should not provide them.',
        ],
    },
    {
        title: 'Access to information',
        content: [
            'Access is intended to be limited by role and need. Authorized thesis team members, supervisors, institutional personnel, and approved technical service operators may access information when necessary for development, support, security, research oversight, or compliance. Other users may see information that is deliberately shared through future marketplace or transaction features.',
        ],
    },
    {
        title: 'Implemented security practices',
        content: [
            'The current authentication foundation uses Laravel password hashing, signed email-verification links, hashed and expiring login codes, failed-attempt and resend limits, server-side role middleware, session regeneration after authentication, and session invalidation on logout. Development email can be written to a local log or viewed in Mailpit.',
            'No system can promise absolute security. These practices describe the implemented foundation and are not a claim of penetration testing, external audit, encryption of every stored field, legal certification, or production-readiness.',
        ],
    },
    {
        title: 'Retention and deletion',
        content: [
            'Information is kept only as long as reasonably needed for the prototype, security, thesis evaluation, institutional recordkeeping, dispute handling, or applicable legal obligations. Development databases may be reset. Records that are no longer needed should be securely deleted or anonymized where practical, subject to approved research and institutional retention requirements.',
        ],
    },
    {
        title: 'Academic and research use',
        content: [
            'Authorized project members may analyze system use, usability feedback, errors, and prototype outcomes for the undergraduate thesis, demonstrations, evaluation, and related academic reporting. Direct identifiers should be minimized where individual identification is not necessary. Any separate study activity requiring consent or ethics review should be handled through the applicable institutional process.',
        ],
    },
    {
        title: 'Aggregated reporting',
        content: [
            'The project may prepare statistics or reports that combine data across participants, such as counts of account types or completed test tasks. Aggregated or de-identified reporting should avoid reasonably identifying an individual. It is not used as a reason to publish raw personal data.',
        ],
    },
    {
        title: 'Your rights and choices',
        content: [
            'Subject to applicable law and legitimate institutional requirements, a participant may ask what personal information is held, request access or correction, object to or restrict certain processing, withdraw consent where consent is the basis, request deletion or blocking when appropriate, and raise a privacy concern. Identity may need to be verified before a request is fulfilled.',
            'Requests should be sent to the thesis team or supervising institution through the contact method provided for the study. Some requests may be limited where information must be retained for security, legal, academic-integrity, or approved research obligations; the reason should be explained where appropriate.',
        ],
    },
    {
        title: 'Notice changes',
        content: [
            'This notice may be updated as AgriFarm changes. A revised date and updated text should be shown here, and renewed acceptance should be requested if a change materially affects information handling and applicable requirements call for it.',
        ],
    },
];

export default function Privacy() {
    return (
        <LegalDocument
            title="Privacy Notice"
            updated="September 2, 2026"
            summary="This notice describes the information used by AgriFarm, why it is needed, who may access it, and the choices available to project participants."
            sections={sections}
        />
    );
}
