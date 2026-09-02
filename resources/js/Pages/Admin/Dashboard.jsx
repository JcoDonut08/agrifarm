import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Dashboard() {
    return (
        <>
            <Head title="CENRO admin dashboard" />
            <RoleWelcome
                title="CENRO admin dashboard"
                introduction="Your pre-created CENRO administrator account is signed in with its assigned server-side role."
                label="Administrator access confirmed"
                detail="Operational administration, marketplace review, forecasting, and profile management are intentionally outside the authentication foundation."
            />
        </>
    );
}
