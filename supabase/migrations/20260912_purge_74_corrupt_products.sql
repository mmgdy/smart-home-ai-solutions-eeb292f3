-- Migration: 20260912_purge_74_corrupt_products.sql
-- Description: Heal 1 product with verified image fallback, and permanently delete 74 invalid products with broken/soft-404 images.
-- Generated from complete 808-product audit.

BEGIN;

-- 1. Heal 1 product with verified supplier image
UPDATE public.products
SET 
  image_url = 'https://www.vesternet.com/cdn/shop/files/409500010139_2.png?v=1757942579&width=1214',
  updated_at = NOW()
WHERE id = 'ee2c2c0f-c510-4c54-a628-0b924a9521ce';

-- 2. Delete 74 confirmed invalid products
-- Note: order_items.product_id and products.parent_id have ON DELETE SET NULL, preserving order histories safely.
DELETE FROM public.products
WHERE id IN (
  '00a81b7e-7ba2-4525-876e-fcf0bdc58066',
  '0772b9a5-2479-4597-babe-3e6de22dc6f0',
  '08dac19d-1bda-445e-8b97-8f2384a0b19e',
  '102f0436-4941-4bcb-bb63-6f2eb4148b4e',
  '12a75ba7-ba85-4abb-a0d8-923eb894453f',
  '176f1864-ddd6-42a2-9030-38b01d5e5b5b',
  '17e769be-445d-4be8-b737-0512379234fc',
  '2124f3bc-5de9-4e76-abc6-71e93e50a5b7',
  '25e486b1-37a0-4bdd-8f7b-d804b443cb43',
  '29845750-ef1a-45d1-8ed9-4a13a92a7923',
  '2a5597bf-6951-440f-ba3d-ce292d8163a3',
  '2b9f6fbe-c954-4ec1-ad50-7341fadaad6a',
  '2c2eb2d5-aa67-4db2-bbbe-7dc11a5ea646',
  '2d9b296a-8f86-4f0c-9031-e14e97d480f8',
  '39019d02-950d-47fb-b687-08e0b57bcbd9',
  '3ad4366d-fc41-44c2-a64f-8cc274109ff1',
  '3e21631d-d9fc-4ecf-931c-90e9bb394971',
  '431cac7c-5b56-4606-b9d0-5c2e8f34e5fe',
  '47fec087-babe-4cfe-a147-0119d1a994b5',
  '4d1a0c16-cd61-414a-aa75-1d1be8db05c5',
  '542dad72-6ae1-4cdc-afa4-b002f25f67ad',
  '5a59b936-b953-4f95-ac0c-0944050e14c5',
  '5c4ec7ac-50fc-4415-92be-9a98b38ce348',
  '69532f0a-3140-4c63-a83a-84a08456a003',
  '6d873a22-9886-4d32-88b0-d086ef4cc86f',
  '6e4615f3-6ac4-45d3-929a-0a084b543151',
  '7343ff57-d924-4389-a4f5-4253e8d28e49',
  '74097a38-00f6-4633-9882-f03611b23e8b',
  '75f086e0-74a0-472c-869c-321f3cd0aed1',
  '77fd8def-aae7-4f9d-a236-e28666de668b',
  '786a79b1-d3ba-4264-b687-05246daeefbc',
  '78caa524-e401-4359-b810-17db485fa69b',
  '78e16dc3-85df-48df-9dbb-b80fc41485e8',
  '797859c0-1661-46df-8163-4f047dab26f5',
  '79d30b9c-b1e1-4690-bcfe-bdb691ce2995',
  '79f92b46-bb6b-4e55-a36e-a82139dba946',
  '7a078b67-7068-457e-88c3-78144ef0086a',
  '7ab8e33e-6ab1-41d4-bcb2-55aba9cad7dd',
  '7adc1c94-c9f9-42c4-a542-5b39e1069f44',
  '7ae9952f-52b8-461c-b595-0045d17feaf2',
  '7b04b596-8a9f-4c01-b9a3-5004d8b48302',
  '7e9e6cec-a8a8-4812-9716-932c47ca85d8',
  '7f61b638-56ee-4366-9a38-8c272c175709',
  '830c5d27-be9b-4bda-9d4d-4e5584af546a',
  '83460a01-dea8-4eab-97d1-3efc381962ae',
  '8b1aee1b-a1b6-44b2-964c-3623b52fbf20',
  '8f4bf024-b186-4f72-988f-4eff59ec449d',
  '92d203f6-09cc-4ccf-a625-b11bdafd65b2',
  '95dc7138-e0fa-44de-84a7-ccb7aa002a01',
  '993853d7-b516-44ba-a12a-6fef12f0bad2',
  '9f548cd9-cd7d-43c6-8f0c-682fc69aa355',
  'a7300826-cf11-4046-ae7f-c60cab6f9e2b',
  'a9fc63f4-0539-4cbf-b44e-84a2857b30df',
  'aa87aa73-b54c-4f00-9d06-f3bc856f59d4',
  'b9d95ae1-a01f-468b-a3a1-94583b84f190',
  'ba926f8c-9705-43f0-b747-5d678f705220',
  'be16cf36-11df-40dc-90a0-4b94f60e79b0',
  'c8dac2a3-b528-4db6-b182-d82e05ea8e4e',
  'cd476b9c-c5e8-4d72-98c9-34f3d6144523',
  'ded76dce-190a-4f2f-88f5-1305f4b0af72',
  'e3aaa3d3-6a14-4833-8576-4984ccec16ab',
  'e68f3306-2d7c-4ce3-af62-ddc055d4d03c',
  'e6e93ffa-45e8-407c-8f85-79a8e1deee27',
  'e7608b6e-5a98-46e4-9cd6-38314e186005',
  'e8243219-43e8-42dc-a0df-4e462adb860c',
  'e829d024-8f2a-4e7e-a902-980265b0c050',
  'e8706b69-cae7-4c3f-84d8-bef75bd65d29',
  'e9744140-8946-4bcc-9d5d-0f139fbff34c',
  'eb3c1835-a401-4231-90d4-a2c4307aabf3',
  'ecf75040-760f-4164-b179-421f18de7e37',
  'ed888061-48e7-4d10-ba32-ce7d3e71be3a',
  'f63d5ae0-ce64-42b4-ae39-c119b257b721',
  'f8e66a33-4c38-47ba-b0d2-ac8d5f4b4141',
  'fe4e0112-5497-4ad7-8c99-49d105ed4cef'
);

COMMIT;
