import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Dashboard() {
    return (
        <>
            <Head title="Seller workspace" />
            <RoleWelcome
                title="Seller workspace"
                introduction="Your assigned seller account gives you protected access to the AgriFarm workspace."
                label="Your seller workspace is ready"
                detail="Store setup, product listings, inventory, and seller account tools will be introduced with the marketplace phase. Public registration cannot create seller access."
                role="seller"
                availableNow={['Assigned seller access', 'Email code protection', 'Secure sign out']}
            />
        </>
    );
}
