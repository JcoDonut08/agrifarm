<?php
$content = file_get_contents("resources/css/storefront.css");

$search = ".dark .review-item-actions button.is-delete { color: #ffaaa0; }";
$replace = ".dark .review-item-actions button { color: #b8e0c2; }\n.dark .review-item-actions button:hover { border-color: #b8e0c2; background: #304237; }\n.dark .review-reaction-btn.is-active { color: #b8e0c2; }\n.dark .review-item-top span { color: #b8e0c2; }\n.dark .review-item-actions button.is-delete { color: #ffaaa0; }";

$content = str_replace($search, $replace, $content);
file_put_contents("resources/css/storefront.css", $content);
echo "Fixed dark mode colors\n";

