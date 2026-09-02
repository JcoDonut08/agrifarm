import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Home() {
    return (
        <>
            <Head title="Customer workspace" />
            <RoleWelcome
                title="Customer workspace"
                introduction="Your secure AgriFarm account is ready for the marketplace experience being prepared for customers."
                label="Your marketplace access is ready"
                detail="Browsing produce, ordering, and customer account tools will be introduced in a future marketplace phase. For now, your verified account and secure sign-in are active."
                role="customer"
                availableNow={['Verified customer access', 'Email code protection', 'Secure sign out']}
            />
        </>
    );
}
