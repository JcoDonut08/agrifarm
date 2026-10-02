import fs from 'fs';
const path1 = 'resources/js/Pages/ProductDetail.jsx';
let lines1 = fs.readFileSync(path1, 'utf8').split('\n');
let found = false;
for (let i = 0; i < lines1.length; i++) {
    if (lines1[i].includes('reviewFeed?.summary?.count')) {
        console.log("Found line: " + i);
        lines1[i] = "                    <span aria-hidden=\"true\">{reviewFeed?.summary?.count ? '\u2605'.repeat(Math.round(reviewFeed.summary.average)) + '\u2606'.repeat(5 - Math.round(reviewFeed.summary.average)) : '\u2606\u2606\u2606\u2606\u2606'}</span>{reviewFeed?.summary?.count ? <><strong>{Number(reviewFeed.summary.average).toFixed(1)}</strong><small>{reviewFeed.summary.count} {reviewFeed.summary.count === 1 ? 'review' : 'reviews'}</small></> : <small>No reviews yet</small>}<span className=\"product-detail-rating-link\">See reviews <Icon name=\"arrow\" size={15} /></span>\r";
        found = true;
        break;
    }
}
if (!found) console.log("Not found!");
fs.writeFileSync(path1, lines1.join('\n'), 'utf8');

const path2 = 'resources/js/Components/Storefront/ProductCard.jsx';
let lines2 = fs.readFileSync(path2, 'utf8').split('\n');
for (let i = 0; i < lines2.length; i++) {
    if (lines2[i].includes('className="rating-stars"')) {
        lines2[i] = "                    {count > 0 && <span className=\"rating-stars\" aria-hidden=\"true\"><span style={{ width: `${rating / 5 * 100}%` }}>\u2605\u2605\u2605\u2605\u2605</span>\u2605\u2605\u2605\u2605\u2605</span>}\r";
        break;
    }
}
fs.writeFileSync(path2, lines2.join('\n'), 'utf8');