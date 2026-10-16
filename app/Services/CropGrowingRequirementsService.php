<?php

namespace App\Services;

class CropGrowingRequirementsService
{
    private ?array $catalog = null;

    public function forCrop(string $name): ?array
    {
        $this->catalog ??= json_decode(file_get_contents(storage_path('app/forecasting/crop_growing_requirements.json')), true, 512, JSON_THROW_ON_ERROR);
        $key = mb_strtolower(trim($name));

        foreach ($this->catalog['crops'] as $crop => $guide) {
            $names = array_map(fn (string $alias) => mb_strtolower(trim($alias)), [$crop, ...$guide['aliases']]);
            if (in_array($key, $names, true)) {
                return [
                    'crop' => $crop,
                    'scope' => $guide['scope'],
                    'requirements' => $guide['requirements'],
                    'source' => [...$this->catalog['sources'][$guide['source']], 'pages' => $guide['pages']],
                ];
            }
        }

        return null;
    }
}
