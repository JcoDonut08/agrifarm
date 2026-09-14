import { useState } from 'react';
import Icon from '../../Components/Storefront/Icon';

export default function Avatar({ user, className = 'seller-avatar', filipino = false }) {
    const [failed, setFailed] = useState(null);
    return <span className={className}>{user.avatar_url && failed !== user.avatar_url
        ? <img src={user.avatar_url} alt={filipino ? `Larawan sa profile ni ${user.name}` : `${user.name} profile photo`} onError={() => setFailed(user.avatar_url)} />
        : <Icon name="sprout" size={26} />}</span>;
}
