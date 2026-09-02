import LegalDocument from '../../Components/LegalDocument';

const sections = [
    {
        title: 'Purpose of AgriFarm',
        content: [
            'AgriFarm is an undergraduate academic prototype intended to explore an agricultural marketplace and decision-support system. It may support account access, product information, order-related workflows, and future analytical features during supervised development and evaluation.',
            'The prototype is not a substitute for professional agricultural, financial, legal, meteorological, or business advice.',
        ],
    },
    {
        title: 'Accounts and access',
        content: [
            'Public registration creates customer accounts only. Seller and CENRO administrator accounts are created through authorized project procedures. Users must provide accurate account information, protect their password and email security codes, and promptly report suspected unauthorized access.',
            'Users may not attempt to obtain another role, access another person’s account, or bypass the system’s access restrictions.',
        ],
    },
    {
        title: 'Seller responsibilities',
        content: [
            'Sellers are responsible for the truthfulness, completeness, legality, and timely maintenance of any product, availability, price, fulfillment, or business information they submit. Seller status does not mean that AgriFarm endorses, licenses, inspects, or guarantees a seller or their goods.',
        ],
    },
    {
        title: 'Product listings and pricing',
        content: [
            'Product descriptions, images, availability, units, and prices are supplied for prototype use and may contain errors or become outdated. A displayed listing or price is not a guarantee that an item is available, suitable, compliant, or offered on identical terms outside the prototype.',
        ],
    },
    {
        title: 'Orders and prototype payments',
        content: [
            'Any order feature is subject to seller confirmation and the limitations of the academic prototype. Unless a future release clearly states otherwise, AgriFarm does not process real payments, hold funds, provide escrow, arrange delivery, or guarantee that a transaction will be completed. Users should not enter real card, bank, wallet, or other payment credentials into prototype fields.',
        ],
    },
    {
        title: 'Prohibited use',
        content: ['Users must use AgriFarm lawfully and in a way that does not harm the project, its participants, or its data. Prohibited activities include:'],
        items: [
            'impersonation, fraud, deceptive listings, unlawful goods, or intentionally false information;',
            'unauthorized access, role escalation, security testing without written permission, or interference with normal operation;',
            'malware, automated abuse, scraping that disrupts the prototype, or attempts to obtain credentials or personal data;',
            'using project information to harass, discriminate against, exploit, or otherwise harm another person.',
        ],
    },
    {
        title: 'Forecasting and decision-support disclaimer',
        content: [
            'Forecasts, recommendations, rankings, alerts, or other analytical outputs—if introduced—are estimates for decision support and academic evaluation. They may use incomplete, delayed, simulated, or uncertain data and must be independently checked before action is taken.',
            'AgriFarm forecasts and recommendations do not guarantee weather conditions, crop survival or yield, product quality, market demand, sales, or profitability. Users remain responsible for their farming and business decisions and their consequences.',
        ],
    },
    {
        title: 'System availability and changes',
        content: [
            'The prototype may be unavailable, reset, changed, suspended, or discontinued without continuous-service commitments. Data may be corrected or removed during development, testing, maintenance, or academic review. Users should not rely on AgriFarm as their only recordkeeping or operational system.',
        ],
    },
    {
        title: 'Academic prototype limitations',
        content: [
            'AgriFarm is a thesis system under active development, not a certified commercial platform or government service. Features, policies, datasets, and results may be incomplete. Participation in testing does not create a promise of commercial launch, permanent access, financial return, or adoption by any institution.',
        ],
    },
    {
        title: 'Acceptance and questions',
        content: [
            'By creating a customer account, you confirm that you have read and accepted these Terms and the Privacy Notice. The project stores the time of that acceptance. Questions should be directed to the thesis team or supervising institution through the contact method supplied for the study.',
        ],
    },
];

export default function Terms() {
    return (
        <LegalDocument
            title="Terms of Use"
            updated="September 2, 2026"
            summary="These terms explain the permitted use and important limitations of the AgriFarm undergraduate thesis prototype."
            sections={sections}
        />
    );
}
