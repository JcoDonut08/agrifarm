const directMessages = {
    'Harvest record updated successfully.': 'Na-update ang tala ng ani.',
    'Choose one of your existing products.': 'Pumili ng isa sa iyong mga produkto.',
    'Enter a harvested quantity greater than zero.': 'Ilagay ang dami ng ani na higit sa zero.',
    'Choose a unit.': 'Pumili ng yunit.',
    'Choose the harvest date.': 'Pumili ng petsa ng ani.',
    'Harvest date cannot be in the future.': 'Hindi maaaring lumampas sa kasalukuyang araw ang petsa ng ani.',
    'Choose where this order originally reserved its quantity.': 'Piliin kung saan orihinal na inilaan ang dami para sa order na ito.',
    'Choose available stock or future harvest.': 'Piliin ang available na stock o ang inaasahang ani.',
    'Choose a reason for cancelling this order.': 'Pumili ng dahilan ng pagkansela.',
    'Choose a valid cancellation reason.': 'Pumili ng wastong dahilan ng pagkansela.',
    'Explain why you are cancelling this order.': 'Ipaliwanag kung bakit mo kakanselahin ang order.',
    'Use at least 5 characters for the explanation.': 'Gumamit ng hindi bababa sa 5 karakter sa paliwanag.',
    'Keep the explanation within 500 characters.': 'Panatilihin ang paliwanag sa loob ng 500 karakter.',
    'Product added successfully.': 'Matagumpay na naidagdag ang produkto.',
    'Product updated successfully.': 'Matagumpay na na-update ang produkto.',
    'Finish or cancel open orders before changing the selling unit.': 'Tapusin o kanselahin muna ang mga bukas na order bago baguhin ang unit ng bentahan.',
    'Refresh this product before changing its stock.': 'I-refresh ang produktong ito bago baguhin ang stock nito.',
    'Refresh this product before changing its expected harvest quantity.': 'I-refresh ang produktong ito bago baguhin ang inaasahang dami ng ani nito.',
    'Product deleted successfully.': 'Matagumpay na nabura ang produkto.',
    'Walk-in order added successfully.': 'Matagumpay na naidagdag ang walk-in order.',
    'Order accepted and moved to preparing.': 'Tinanggap na ang order at inihahanda na ito.',
    'Order marked for delivery.': 'Nakatakda na ang order para sa paghahatid.',
    'Delivery confirmed.': 'Nakumpirma na ang paghahatid.',
    'Order cancelled and stock restored.': 'Kinansela ang order at naibalik ang stock.',
    'Order cancelled.': 'Kinansela ang order.',
    'This older order needs its original stock or harvest reservation confirmed before cancellation. Contact the administrator.': 'Kailangang kumpirmahin kung sa stock o sa inaasahang ani inilaan ang mas lumang order na ito bago kanselahin. Makipag-ugnayan sa administrator.',
    'Order status updated.': 'Na-update ang status ng order.',
    'Profile updated.': 'Na-update ang profile.',
    'Profile updated successfully.': 'Na-save ang profile.',
    'Profile saved. Check your new email for a confirmation link. Your sign-in email stays the same until you confirm.': 'Na-save ang profile. Tingnan ang bagong email para sa link ng kumpirmasyon. Mananatili ang kasalukuyang sign-in email hanggang makumpirma ang bago.',
    'Email address updated successfully.': 'Matagumpay na na-update ang email address.',
    'Password updated.': 'Na-update ang password.',
    'Password updated successfully.': 'Na-update ang password.',
    'Profile photo updated.': 'Na-update ang larawan sa profile.',
    'Profile photo updated successfully.': 'Na-update ang larawan sa profile.',
    'Profile photo removed.': 'Inalis ang larawan sa profile.',
    'The photo could not be saved. Please try again.': 'Hindi na-save ang larawan. Pakisubukan muli.',
    'One or more selected products could not be deleted.': 'Hindi nabura ang isa o higit pang napiling produkto.',
    'That order status change is not allowed.': 'Hindi pinapayagan ang pagbabagong iyon sa status ng order.',
    'The current password is incorrect.': 'Mali ang kasalukuyang password.',
    'The password field confirmation does not match.': 'Hindi magkatugma ang bagong password at kumpirmasyon nito.',
    'The email field must be a valid email address.': 'Maglagay ng wastong email address.',
    'The email has already been taken.': 'May gumagamit na ng email address na ito.',
    'The photo field must be an image.': 'Kailangang larawan ang napiling file.',
    'The photo field must be a file of type: jpg, jpeg, png, webp.': 'JPG, JPEG, PNG, o WebP lamang ang maaaring gamitin.',
    'The photo has invalid image dimensions.': 'Hindi wasto ang sukat ng larawan.',
    'The password field must contain at least one letter.': 'Kailangang may kahit isang letra ang password.',
    'The password field must contain at least one number.': 'Kailangang may kahit isang numero ang password.',
    'The password field and current password must be different.': 'Kailangang iba ang bagong password sa kasalukuyang password.',
};

export function localizeMessage(message, filipino) {
    if (!filipino || !message) return message;
    if (directMessages[message]) return directMessages[message];
    if (message.startsWith('Harvest recorded successfully.')) return 'Naitala ang ani.';
    if (/^Harvest record for .+ deleted successfully\.$/.test(message)) return 'Nabura ang tala ng ani.';

    const inventoryChanged = message.match(/^(Available stock|Expected harvest quantity) changed\. Current quantity: (\d+)\. Review it before saving\.$/);
    if (inventoryChanged) return `${inventoryChanged[1] === 'Available stock' ? 'Nagbago ang available na stock' : 'Nagbago ang inaasahang dami ng ani'}. Kasalukuyang dami: ${inventoryChanged[2]}. Suriin ito bago mag-save.`;

    const deleted = message.match(/^(\d+) products? deleted successfully\.$/);
    if (deleted) return `Matagumpay na nabura ang ${deleted[1]} produkto.`;

    const available = message.match(/^Only (\d+) (.+) available\.$/);
    if (available) return `${available[1]} ${unitLabel(available[2], true)} na lang ang available.`;

    const required = message.match(/^The (.+) field is required\.$/);
    if (required) return `Kailangang punan ang ${fieldLabel(required[1])}.`;

    const maximum = message.match(/^The (.+) field must not be greater than (.+)\.$/);
    if (maximum) return `Hindi maaaring lumampas sa ${maximum[2]} ang ${fieldLabel(maximum[1])}.`;

    const minimum = message.match(/^The (.+) field must be at least (.+)\.$/);
    if (minimum) return `Dapat hindi bababa sa ${minimum[2]} ang ${fieldLabel(minimum[1])}.`;

    const invalid = message.match(/^The selected (.+) is invalid\.$/);
    if (invalid) return `Hindi wasto ang napiling ${fieldLabel(invalid[1])}.`;

    return message;
}

function fieldLabel(field) {
    return ({
        name: 'pangalan',
        email: 'email address',
        category: 'kategorya',
        description: 'paglalarawan',
        price: 'presyo',
        stock: 'stock',
        threshold: 'paalala sa stock',
        photo: 'larawan',
        product_id: 'produkto',
        quantity: 'dami',
        current_password: 'kasalukuyang password',
        password: 'password',
        profile_password: 'password',
    })[field] || field.replaceAll('_', ' ');
}

export function unitLabel(unit, filipino) {
    if (!filipino) return unit;
    return ({ bunch: 'tali', piece: 'piraso', head: 'ulo', pack: 'pakete' })[unit] || unit;
}

export function categoryLabel(category, filipino) {
    if (!filipino) return category;
    return ({ Vegetables: 'Mga gulay', Fruits: 'Mga prutas', Herbs: 'Mga halamang pampalasa', Beans: 'Mga munggo at patani' })[category] || category;
}

export function weatherCondition(weather, filipino) {
    const original = weather?.condition || '';
    if (!filipino || !original) return original;

    const key = `${weather?.condition_key || ''} ${original}`.toLowerCase();
    if (key.includes('thunder') || key.includes('storm')) return 'May pagkulog, pagkidlat, at pag-ulan';
    if (key.includes('heavy') && (key.includes('rain') || key.includes('shower'))) return 'May malakas na pag-ulan';
    if (key.includes('rain') || key.includes('shower')) return 'May pag-ulan';
    if (key.includes('drizzle')) return 'May ambon';
    if (key.includes('fog') || key.includes('mist')) return 'Maulap at mahamog';
    if (key.includes('partly') || key.includes('mostly clear')) return 'Bahagyang maulap';
    if (key.includes('overcast')) return 'Makulimlim';
    if (key.includes('cloud')) return 'Maulap';
    if (key.includes('clear') || key.includes('sun')) return 'Maaliwalas';
    return original;
}
