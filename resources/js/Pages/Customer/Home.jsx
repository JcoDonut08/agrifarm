import { Head, useForm, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import ThemeToggle from '../../Components/ThemeToggle';
import Icon from '../../Components/Storefront/Icon';
import { ShopProvider } from '../../Components/Storefront/ShopContext';
import AddressAutocomplete from '../../Components/Storefront/AddressAutocomplete';
import StorefrontLayout from '../../Layouts/StorefrontLayout';
import FormStatus from '../../Components/FormStatus';
import ConfirmationDialog from '../../Components/ConfirmationDialog';

function Field({ label, error, hint, ...props }) {
    return <label className="customer-field">{label}<input aria-invalid={Boolean(error)} {...props} />{hint && <span>{hint}</span>}{error && <small role="alert">{error}</small>}</label>;
}

function ProfileAvatar({ user, preview, large = false }) {
    const initials = user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
    return <span className={`customer-profile-avatar${large ? ' is-large' : ''}`}>
        {preview || user.avatar_url ? <img src={preview || user.avatar_url} alt="Your profile" /> : <span aria-hidden="true">{initials}</span>}
    </span>;
}

export default function Home() {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const filipino = typeof window !== 'undefined' && localStorage.getItem('agrifarm-customer-language') === 'filipino';
    const profile = useForm({ name: user.name || '', username: user.username || '', mobile_number: user.mobile_number || '', delivery_address: user.delivery_address || '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const photo = useForm({ photo: null });
    const photoInput = useRef(null);
    const [notifications, setNotifications] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('agrifarm-customer-notifications') || '{"orderUpdates":true,"promotions":false}');
        } catch { return {"orderUpdates":true,"promotions":false}; }
    });
    const onNotificationChange = (key, val) => {
        const next = { ...notifications, [key]: val };
        setNotifications(next);
        localStorage.setItem('agrifarm-customer-notifications', JSON.stringify(next));
    };
    const [preview, setPreview] = useState(null);
    const [removingPhoto, setRemovingPhoto] = useState(false);
    const statusMessages = {
        'Profile saved.': 'Na-save ang profile.',
        'Password updated.': 'Na-update ang password.',
        'Profile photo updated.': 'Na-update ang larawan sa profile.',
        'Profile photo removed.': 'Inalis ang larawan sa profile.',
    };

    useEffect(() => {
        if (!photo.data.photo) { setPreview(null); return; }
        const url = URL.createObjectURL(photo.data.photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo.data.photo]);

    function clearPhoto() {
        photo.reset();
        if (photoInput.current) photoInput.current.value = '';
    }

    function savePhoto(event) {
        event.preventDefault();
        photo.post('/customer/profile/photo', { forceFormData: true, preserveScroll: true, onSuccess: clearPhoto });
    }

    function saveProfile(event) {
        event.preventDefault();
        profile.patch('/customer/profile', { preserveScroll: true });
    }

    function savePassword(event) {
        event.preventDefault();
        password.put('/customer/password', { preserveScroll: true, onSuccess: () => password.reset() });
    }

    return <ShopProvider products={[]} persist={false}><StorefrontLayout>
        <Head title={filipino ? 'Aking Profile' : 'My profile'} />
        <div className="store-container customer-profile-page">
            <header className="customer-profile-heading"><h1>{filipino ? 'Aking profile' : 'My profile'}</h1></header>
            <div className="customer-profile-panel">
            <div className="customer-profile-content">
                <div className="customer-profile-identity"><ProfileAvatar user={user} /><div><strong>{user.name}</strong><span>{user.username ? `@${user.username} · ${user.email}` : user.email}</span></div></div>
                <FormStatus dismissible messageId={flash?.id} dismissLabel={filipino ? 'Isara ang mensahe' : 'Dismiss message'}>{filipino ? statusMessages[flash?.status] || flash?.status : flash?.status}</FormStatus>

                <form onSubmit={savePhoto} className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>{filipino ? 'Larawan sa profile' : 'Profile photo'}</h2><p>{filipino ? 'Pumili ng larawan para sa iyong AgriFarm account.' : 'Choose a photo for your AgriFarm account.'}</p></div>
                    <div className="customer-settings-fields">
                        <ProfileAvatar user={user} preview={preview} large />
                        <label htmlFor="customer-photo">{filipino ? 'Pumili ng larawan' : 'Choose profile photo'}</label>
                        <input id="customer-photo" ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="customer-photo-help" aria-invalid={Boolean(photo.errors.photo)} onChange={event => { photo.clearErrors(); photo.setData('photo', event.target.files?.[0] || null); }} />
                        <p id="customer-photo-help" className="customer-field-hint">{filipino ? 'JPG, PNG o WebP. Hanggang 2 MB.' : 'JPG, PNG or WebP. Up to 2 MB.'}</p>
                        {photo.errors.photo && <small role="alert" className="customer-field-error">{photo.errors.photo}</small>}
                        <div className="customer-profile-actions"><button className="store-button" disabled={!photo.data.photo || photo.processing}>{filipino ? (photo.processing ? 'Sine-save…' : 'I-save ang larawan') : (photo.processing ? 'Saving…' : 'Save photo')}</button>{photo.data.photo && <button type="button" className="checkout-outline-button" onClick={clearPhoto} disabled={photo.processing}>{filipino ? 'Kanselahin' : 'Cancel'}</button>}{user.avatar_url && <button type="button" className="seller-danger-button" disabled={photo.processing} onClick={() => setRemovingPhoto(true)}>{filipino ? 'Alisin ang larawan' : 'Remove photo'}</button>}</div>
                    </div>
                </form>

                <form onSubmit={saveProfile} noValidate className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>{filipino ? 'Personal at delivery details' : 'Personal and delivery details'}</h2><p>{filipino ? 'Lalabas ang naka-save na detalye sa checkout. Maaari itong baguhin sa bawat order.' : 'Saved details appear at checkout. You can edit them for each order.'}</p></div>
                    <div className="customer-settings-fields">
                        <Field label={filipino ? 'Buong pangalan' : 'Full name'} autoComplete="name" maxLength="120" required value={profile.data.name} onChange={event => profile.setData('name', event.target.value)} error={profile.errors.name} />
                        <Field label={filipino ? 'Username (opsyonal)' : 'Username (optional)'} autoComplete="username" maxLength="40" value={profile.data.username} onChange={event => profile.setData('username', event.target.value)} error={profile.errors.username} />
                        <Field label="Email address" type="email" readOnly value={user.email} hint={filipino ? 'Awtomatikong gagamitin sa checkout ang email ng iyong account.' : 'Your sign-in email fills checkout automatically.'} />
                        <Field label={filipino ? 'Numero ng mobile' : 'Mobile number'} type="tel" autoComplete="tel" inputMode="tel" value={profile.data.mobile_number} onChange={event => profile.setData('mobile_number', event.target.value)} error={profile.errors.mobile_number} />
                        <AddressAutocomplete className="customer-field" value={profile.data.delivery_address} onChange={address => profile.setData('delivery_address', address)} error={profile.errors.delivery_address} />
                        <div className="customer-profile-actions"><button className="store-button" disabled={profile.processing}>{filipino ? (profile.processing ? 'Sine-save…' : 'I-save ang detalye') : (profile.processing ? 'Saving…' : 'Save details')}</button></div>
                    </div>
                </form>

                <form onSubmit={savePassword} noValidate className="customer-settings-section">
                    <div className="customer-settings-intro"><h2>{filipino ? 'Palitan ang password' : 'Change password'}</h2><p>{filipino ? 'Gumamit ng hindi bababa sa 8 character, kasama ang mga letra at numero.' : 'Use at least 8 characters, including letters and numbers.'}</p></div>
                    <div className="customer-settings-fields">
                        <Field label={filipino ? 'Kasalukuyang password' : 'Current password'} type="password" autoComplete="current-password" required value={password.data.current_password} onChange={event => password.setData('current_password', event.target.value)} error={password.errors.current_password} />
                        <Field label={filipino ? 'Bagong password' : 'New password'} type="password" autoComplete="new-password" required value={password.data.password} onChange={event => password.setData('password', event.target.value)} error={password.errors.password} />
                        <Field label={filipino ? 'Kumpirmahin ang bagong password' : 'Confirm new password'} type="password" autoComplete="new-password" required value={password.data.password_confirmation} onChange={event => password.setData('password_confirmation', event.target.value)} error={password.errors.password_confirmation} />
                        <div className="customer-profile-actions">
                            <button type="submit" disabled={password.processing} className="store-button">{filipino ? (password.processing ? 'Ina-update…' : 'I-update ang password') : (password.processing ? 'Updating…' : 'Update password')}</button>
                        </div>
                    </div>
                </form>


            </div>
            </div>
        </div>
        <ConfirmationDialog open={removingPhoto} title={filipino ? 'Alisin ang larawan sa profile?' : 'Remove profile photo?'} description={filipino ? 'Maaari kang mag-upload ng bagong larawan anumang oras.' : 'You can upload a new photo at any time.'} confirmLabel={filipino ? 'Alisin ang larawan' : 'Remove photo'} cancelLabel={filipino ? 'Kanselahin' : 'Cancel'} workingLabel={filipino ? 'Inaalis…' : 'Removing…'} busy={photo.processing} onCancel={() => setRemovingPhoto(false)} onConfirm={() => photo.delete('/customer/profile/photo', { preserveScroll: true, onSuccess: () => { clearPhoto(); setRemovingPhoto(false); } })} />
    </StorefrontLayout></ShopProvider>;
}
