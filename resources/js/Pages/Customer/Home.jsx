import { Head } from '@inertiajs/react';

import RoleWelcome from '../../Components/RoleWelcome';

export default function Home() {
    return (
        <>
            <Head title="Customer area" />
            <RoleWelcome
                title="Customer area"
                introduction="Your verified customer account is signed in and protected by email code verification."
                label="Authentication foundation ready"
                detail="Marketplace, ordering, and customer profile features are intentionally outside this implementation and will be added in later project phases."
            />
        </>
    );
}
