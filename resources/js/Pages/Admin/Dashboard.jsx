import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Dashboard() {
    return (
        <>
            <Head title="CENRO admin workspace" />
            <RoleWelcome
                title="CENRO admin workspace"
                introduction="Your assigned administrator account gives you protected access to AgriFarm."
                label="Your administrator workspace is ready"
                detail="Marketplace oversight, account administration, and reporting tools will be introduced in their approved project phases. No unavailable controls or statistics are shown here."
                role="admin"
                availableNow={['Assigned admin access', 'Server-enforced role protection', 'Secure sign out']}
            />
        </>
    );
}
