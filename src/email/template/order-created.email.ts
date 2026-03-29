export type OrderCreatedEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: {
    name: string;
    quantity: number;
    imageurls?: string[];
  }[];
  destination: string;
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderItems = (items: OrderCreatedEmailData['items']) => {
  if (!items.length) {
    return `
      <tr>
        <td style="padding: 10px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #555555; border: 1px solid #ececec;">
          No line items available.
        </td>
      </tr>
    `;
  }

  return items
    .map((item, index) => {
      const safeName = escapeHtml(item.name);
      const safeQuantity = Number.isFinite(item.quantity) ? item.quantity : 0;
      const images = item.imageurls ?? [];

      const imageStrip =
        images.length > 0
          ? `
            <div style="margin-top: 8px;">
              ${images
                .slice(0, 3)
                .map(
                  (url) =>
                    `<img src="${escapeHtml(url)}" alt="${safeName}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 6px; margin-right: 6px; border: 1px solid #ececec;" />`,
                )
                .join('')}
            </div>
          `
          : '';

      return `
        <tr>
          <td style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 14px; color: #393d47; border: 1px solid #ececec; background: ${index % 2 === 0 ? '#ffffff' : '#fafafa'};">
            <div><strong>${safeName}</strong></div>
            <div style="margin-top: 4px; color: #666666;">Quantity: ${safeQuantity}</div>
            ${imageStrip}
          </td>
        </tr>
      `;
    })
    .join('');
};

export const orderCreatedTemplate = (order: OrderCreatedEmailData) => {
  const safeCustomerName = escapeHtml(order.customerName);
  const safeOrderId = escapeHtml(order.orderId);
  const safeDestination = escapeHtml(order.destination);
  const safeCustomerEmail = escapeHtml(order.customerEmail);

  return `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <link href="https://fonts.googleapis.com/css2?family=Ubuntu:wght@400;700&display=swap" rel="stylesheet" type="text/css">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #ffffff; }
    .row-content { width: 500px; margin: 0 auto; }
    @media (max-width: 520px) {
      .row-content { width: 100% !important; }
      .mobile-stack { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="background-color: #f5f5f5; margin: 0; padding: 0;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f5f5f5;">
    <tbody>
      <tr>
        <td>
          <table class="row-content" align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #ffffff; color: #000000; width: 500px; margin: 0 auto;">
            <tbody>
              <tr>
                <td style="padding: 12px 0; text-align: center; background-color: #f5f5f5;">
                  <img src="https://d9933677e9.imgdist.com/pub/bfra/11x6bd75/xcx/u60/fol/Screenshot%202026-03-29%20at%2014.45.53.png" alt="Mydeliverynav" style="display: inline-block; width: 200px; max-width: 100%; border: 0; height: auto;" />
                </td>
              </tr>

              <tr>
                <td style="padding: 20px 20px 10px 20px; text-align: center;">
                </td>
              </tr>

              <tr>
                <td style="padding: 0 20px 8px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #393d47;">
                  <h1 style="margin: 0; font-size: 22px; line-height: 1.2;"><strong>Order Confirmed</strong></h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 26px 16px 26px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #555555; font-size: 14px; line-height: 1.6;">
                  Thank you <strong>${safeCustomerName}</strong>. We received your order and started processing it.
                </td>
              </tr>

              <tr>
                <td style="padding: 0 20px 12px 20px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #ececec; border-radius: 8px; overflow: hidden;">
                    <tbody>
                      <tr>
                        <td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-bottom: 1px solid #ececec; border-right: 1px solid #ececec;">
                          Order ID
                          <div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>#${safeOrderId}</strong></div>
                        </td>
                        <td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-bottom: 1px solid #ececec;">
                          Destination
                          <div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeDestination}</strong></div>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
                          Customer Email
                          <div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCustomerEmail}</strong></div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding: 2px 20px 10px 20px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #393d47;">
                  <h2 style="margin: 0; font-size: 16px; line-height: 1.2;"><strong>Items in your order</strong></h2>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 20px 18px 20px;">
                  <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border-radius: 8px; overflow: hidden;">
                    <tbody>
                      ${renderItems(order.items)}
                    </tbody>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 20px 22px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
                  We’ll send another update once your package is dispatched.
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>
`;
};
