import { useForm, usePage } from '@inertiajs/react';
import FormField from '../../Components/FormField';
import PasswordField from '../../Components/PasswordField';

import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import SellerFlashStatus from './SellerFlashStatus';
import { localizeMessage } from './SellerLocale';

export default function ProfileForm({ filipino = false }) {
    const { auth, flash } = usePage().props;
    const profile = useForm({ name: auth.user.name, email: auth.user.email, profile_password: '' });
    const password = useForm({ current_password: '', password: '', password_confirmation: '' });
    const photo = useForm({ photo: null });
    const fileInput = useRef(null);
    const [preview, setPreview] = useState(null);
    useEffect(() => {
        if (!photo.data.photo) { setPreview(null); return; }
        const url = URL.createObjectURL(photo.data.photo);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [photo.data.photo]);
    const clearPhoto = () => { photo.reset(); if (fileInput.current) fileInput.current.value = ''; };
    function savePhoto(event) {
        event.preventDefault();
        photo.post('/seller/profile/photo', { preserveScroll: true, forceFormData: true, onSuccess: clearPhoto });
    }
    const changingEmail = profile.data.email.trim().toLowerCase() !== auth.user.email;

    function saveProfile(event) {
        event.preventDefault();
        profile.patch('/seller/profile', { preserveScroll: true, onSuccess: () => profile.reset('profile_password') });
    }

    function savePassword(event) {
        event.preventDefault();
        password.put('/seller/password', { preserveScroll: true, onSuccess: () => password.reset() });
    }

    return <div className="seller-profile-form">
        <div className="seller-profile-heading"><Avatar user={auth.user} className="seller-store-icon" filipino={filipino} /><div><h2>{auth.user.name}</h2><p>{filipino ? 'Katuwang na barangay · Pasig City' : 'Partner barangay · Pasig City'}</p></div></div>
        <SellerFlashStatus flash={flash} filipino={filipino} />
        <form onSubmit={savePhoto} className="seller-settings-section">
            <div><h2>{filipino ? 'Larawan sa profile' : 'Profile photo'}</h2><p>{filipino ? 'Gamitin ang logo ng inyong barangay o larawan ng inyong urban farm.' : 'Use your barangay logo or a photo of your urban farm.'}</p></div>
            <div className="seller-settings-fields">
                <Avatar user={{ ...auth.user, avatar_url: preview || auth.user.avatar_url }} className="seller-profile-photo" filipino={filipino} />
                <label htmlFor="profile-photo">{filipino ? 'Pumili ng larawan sa profile' : 'Choose profile photo'}</label>
                <input ref={fileInput} id="profile-photo" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="photo-help photo-error" aria-invalid={Boolean(photo.errors.photo)} onChange={event => { photo.clearErrors(); photo.setData('photo', event.target.files?.[0] || null); }} />
                <p id="photo-help">JPG, PNG o WebP. {filipino ? 'Hanggang 2 MB.' : 'Maximum 2 MB.'}</p>
                {photo.errors.photo && <p id="photo-error" role="alert" className="seller-photo-error">{localizeMessage(photo.errors.photo, filipino)}</p>}
                <div className="seller-photo-actions"><button className="seller-save-button" disabled={!photo.data.photo || photo.processing}>{filipino ? (photo.processing ? 'Sine-save…' : 'I-save ang larawan') : (photo.processing ? 'Saving…' : 'Save photo')}</button>{photo.data.photo && <button type="button" className="seller-outline-button" onClick={clearPhoto} disabled={photo.processing}>{filipino ? 'Kanselahin' : 'Cancel'}</button>}{auth.user.avatar_url && <button type="button" className="seller-outline-button" disabled={photo.processing} onClick={() => photo.delete('/seller/profile/photo', { preserveScroll: true, onSuccess: clearPhoto })}>{filipino ? 'Alisin ang larawan' : 'Remove photo'}</button>}</div>
            </div>
        </form>
        <form onSubmit={saveProfile} noValidate className="seller-settings-section">
            <div><h2>{filipino ? 'Detalye ng tindahan' : 'Store details'}</h2><p>{filipino ? 'I-update ang pangalan ng barangay na ipinapakita at email ng account.' : 'Update your barangay’s display name and account email.'}</p></div>
            <div className="seller-settings-fields">
                <FormField id="store-name" label={filipino ? 'Pangalan ng barangay / tindahan' : 'Barangay / store name'} value={profile.data.name} onChange={event => profile.setData('name', event.target.value)} error={localizeMessage(profile.errors.name, filipino)} autoComplete="organization" required maxLength={255} />
                <FormField id="store-email" label={filipino ? 'Email address' : 'Email address'} type="email" value={profile.data.email} onChange={event => profile.setData('email', event.target.value)} error={localizeMessage(profile.errors.email, filipino)} autoComplete="email" required hint={filipino ? 'Kailangang kumpirmahin ang bagong email address bago ito magamit sa pag-sign in.' : 'A new email address must be confirmed before it becomes your sign-in email.'} />
                {changingEmail && <PasswordField id="profile-password" label={filipino ? 'Password para kumpirmahin ang pagbabago ng email' : 'Password to confirm email change'} showLabel={filipino ? 'Ipakita ang' : 'Show'} hideLabel={filipino ? 'Itago ang' : 'Hide'} value={profile.data.profile_password} onChange={event => profile.setData('profile_password', event.target.value)} error={localizeMessage(profile.errors.profile_password, filipino)} autoComplete="current-password" required />}
                <div className="seller-form-actions"><button className="seller-save-button" disabled={profile.processing}>{filipino ? (profile.processing ? 'Sine-save…' : 'I-save ang profile') : (profile.processing ? 'Saving…' : 'Save profile')}</button></div>
            </div>
        </form>
        <form onSubmit={savePassword} noValidate className="seller-settings-section">
            <div><h2>{filipino ? 'Palitan ang password' : 'Change password'}</h2><p>{filipino ? 'Gumamit ng hindi bababa sa 8 character, kasama ang mga letra at numero.' : 'Use at least 8 characters, including letters and numbers.'}</p></div>
            <div className="seller-settings-fields">
                <PasswordField id="current-password" label={filipino ? 'Kasalukuyang password' : 'Current password'} showLabel={filipino ? 'Ipakita ang' : 'Show'} hideLabel={filipino ? 'Itago ang' : 'Hide'} autoComplete="current-password" value={password.data.current_password} onChange={event => password.setData('current_password', event.target.value)} error={localizeMessage(password.errors.current_password, filipino)} required />
                <PasswordField id="new-password" label={filipino ? 'Bagong password' : 'New password'} showLabel={filipino ? 'Ipakita ang' : 'Show'} hideLabel={filipino ? 'Itago ang' : 'Hide'} autoComplete="new-password" value={password.data.password} onChange={event => password.setData('password', event.target.value)} error={localizeMessage(password.errors.password, filipino)} required />
                <PasswordField id="confirm-password" label={filipino ? 'Kumpirmahin ang bagong password' : 'Confirm new password'} showLabel={filipino ? 'Ipakita ang' : 'Show'} hideLabel={filipino ? 'Itago ang' : 'Hide'} autoComplete="new-password" value={password.data.password_confirmation} onChange={event => password.setData('password_confirmation', event.target.value)} error={localizeMessage(password.errors.password_confirmation, filipino)} required />
                <div className="seller-form-actions"><button className="seller-save-button" disabled={password.processing}>{filipino ? (password.processing ? 'Ina-update…' : 'I-update ang password') : (password.processing ? 'Updating…' : 'Update password')}</button></div>
            </div>
        </form>
    </div>;
}
