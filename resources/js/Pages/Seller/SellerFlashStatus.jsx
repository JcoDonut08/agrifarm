import FormStatus from '../../Components/FormStatus';
import { localizeMessage } from './SellerLocale';

export default function SellerFlashStatus({ flash, filipino = false }) {
    return <FormStatus dismissible messageId={flash?.id} dismissLabel={filipino ? 'Isara ang mensahe' : 'Dismiss message'}>{localizeMessage(flash?.status, filipino)}</FormStatus>;
}
