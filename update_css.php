<?php
$content = file_get_contents("resources/css/storefront.css");

$search = ".review-status { margin-top: 16px; padding: 10px 12px; border-radius: 7px; background: var(--store-soft); color: var(--store-green-dark); font-size: 13px; }";
$replace = ".review-status { margin-top: 16px; padding: 10px 12px; border-radius: 7px; background: var(--store-green); color: white; font-size: 13px; }\n.review-attachment { margin-top: 12px; max-width: 100%; border-radius: 8px; }\n.review-attachment img { max-width: 200px; height: auto; border-radius: 8px; object-fit: cover; }\n.review-attachment video { max-width: 200px; height: auto; border-radius: 8px; }\n.review-reactions { display: flex; gap: 12px; margin-top: 12px; }\n.review-reaction-btn { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--store-muted); background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: background 0.2s; }\n.review-reaction-btn:hover { background: var(--store-soft); }\n.review-reaction-btn.is-active { color: var(--store-green-dark); font-weight: 600; }\n.review-attachment-input { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }\n.review-attachment-input input[type=file] { font-size: 13px; }";

$content = str_replace($search, $replace, $content);
file_put_contents("resources/css/storefront.css", $content);
echo "Updated CSS\n";

