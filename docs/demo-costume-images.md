# Ảnh demo danh mục trang phục — 31/10/2026

Ảnh minh họa do công cụ ImageGen tích hợp tạo mới cho dữ liệu demo, không phải ảnh chụp tồn kho thực. Mỗi mẫu có một ảnh riêng, nền studio màu kem; lưu cùng frontend tại `frontend/public/costume-demo/`. Ảnh PNG nguồn được giữ tại thư mục generated_images của Codex; bản WebP dùng trên website được mã hóa để giảm dung lượng. Không có đơn thuê nào được tạo trong lần seed danh mục này.

## Prompt chung

```text
Use case: product-mockup. Create ONE photorealistic square ecommerce product photo for a Vietnamese studio costume rental catalog. Subject: <subject>. Show exactly this product only, complete and clearly identifiable, centered with generous margins, front view. For clothing use an invisible headless mannequin, no human model or visible mannequin parts. For accessories use clean tabletop product photography. Warm pale ivory seamless studio backdrop, soft natural shadows and realistic fabric or material textures. Match a consistent refined rental catalog. No text, no watermark, no brand, no extra props, no collage.
```

## Chủ thể của từng ảnh

| Tệp WebP | Subject |
|---|---|
| whiteAoDai.webp | Traditional pearl white silk Vietnamese ao dai, high mandarin collar and long sleeves, matching white trousers |
| ivoryAoDai.webp | Ivory cream Vietnamese ao dai tunic with delicate lotus floral embroidery and white trousers |
| pinkAoDai.webp | Pastel blush pink Vietnamese ao dai tunic, three quarter sleeves, matching white flowing trousers |
| blueAoDai.webp | Sky blue Vietnamese ao dai tunic in two-layer chiffon with white trousers |
| navyVest.webp | Men's navy blue two-button business suit, jacket and matching trousers, sharp tailoring |
| blackVest.webp | Men's jet black suit with pointed peak lapels, jacket and matching trousers |
| beigeVest.webp | Men's light beige linen-blend suit, jacket and matching trousers |
| navyGown.webp | Navy blue university graduation gown trimmed with golden yellow bands, no cap |
| redGown.webp | Burgundy dark red university graduation gown with black trim and front fastening, no cap |
| blackGown.webp | Black university graduation gown with royal blue trim, no cap |
| creamBaBa.webp | Vietnamese traditional cream ivory ao ba ba outfit, round neck button-down long sleeve blouse and matching loose trousers in textured cotton |
| brownBaBa.webp | Vietnamese traditional earth brown ao ba ba outfit, button-down long sleeve blouse and matching loose trousers |
| maleShirt.webp | Men's crisp white school uniform shirt, long sleeves, simple pointed collar, shirt only, no trousers |
| femaleShirt.webp | Women's white school uniform blouse, short sleeves, rounded Peter Pan collar, blouse only |
| plaidSkirt.webp | Knee-length pleated school uniform skirt in green and navy tartan plaid, skirt only |
| conicalHat.webp | One Vietnamese Hue palm-leaf conical non la hat with white silk chin ribbon |
| books.webp | A stack of three vintage hardcover prop books in brown, forest green and cream, no lettering, no readable text |
| graduationCap.webp | One black square graduation mortarboard cap with gold yellow tassel |
| peachAoDai.webp | Peach pink silk Vietnamese ao dai tunic with long sleeves and matching trousers |
| mossAoDai.webp | Moss green rustic linen Vietnamese ao dai tunic with mandarin collar and cream trousers |
| charcoalVest.webp | Men's charcoal dark grey two-button tailored suit, jacket and matching trousers |
| sageBaBa.webp | Vietnamese traditional pale sage green ao ba ba blouse and matching relaxed trousers |
| pleatedSkirt.webp | Solid navy blue knee-length pleated school uniform skirt, skirt only |
| beigeBeret.webp | One soft beige wool beret hat |
| laceParasol.webp | One open white lace parasol with curved wooden handle, delicate lace textile, for portrait photography |
| ribbonHat.webp | One natural woven straw sunhat with medium brim and an ivory cream ribbon bow |

Ảnh whiteAoDai dùng prompt tương đương, yêu cầu rõ bộ áo dài trắng cổ cao và quần trắng, hiển thị toàn bộ trên mannequin ẩn, nền kem và không chữ/logo/đạo cụ. Các ảnh còn lại dùng prompt chung với subject trong bảng.
