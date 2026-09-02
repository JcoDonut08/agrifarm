import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Dashboard() {
    return (
        <>
            <Head title="Seller dashboard" />
            <RoleWelcome
                title="Seller dashboard"
                introduction="Your pre-created seller account is signed in and protected by email code verification."
                label="Seller access confirmed"
                detail="Store setup, product listings, inventory, and seller profile management are intentionally deferred. Public registration cannot create seller accounts."
            />
        </>
    );
}
