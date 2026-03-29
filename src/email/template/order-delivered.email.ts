export type OrderDeliveredEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  deliveredAt: string;
  deliveredLocation: string;
  recipientName?: string;
  destination: string;
  trackingCode?: string;
  trackingUrl?: string;
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getTrackingUrl = (order: OrderDeliveredEmailData) => {
  if (order.trackingUrl) return order.trackingUrl;

  const baseUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const code = encodeURIComponent(order.trackingCode || order.orderId);

  return `${normalizedBase}/tracking?number=${code}`;
};

export const orderDeliveredTemplate = (order: OrderDeliveredEmailData) => {
  const safeCustomerName = escapeHtml(order.customerName);
  const safeOrderId = escapeHtml(order.orderId);
  const safeCustomerEmail = escapeHtml(order.customerEmail);
  const safeDeliveredAt = escapeHtml(order.deliveredAt);
  const safeDeliveredLocation = escapeHtml(order.deliveredLocation);
  const safeDestination = escapeHtml(order.destination);
  const safeRecipientName = escapeHtml(
    order.recipientName || 'Confirmed recipient',
  );
  const safeTrackingCode = escapeHtml(order.trackingCode || order.orderId);
  const trackingUrl = escapeHtml(getTrackingUrl(order));

  return `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Order Delivered</title>
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
								<td style="padding: 16px 20px 4px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #166534;">
									<h1 style="margin: 0; font-size: 22px; line-height: 1.2;"><strong>Order Delivered Successfully</strong></h1>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 26px 16px 26px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #555555; font-size: 14px; line-height: 1.6;">
									Hi <strong>${safeCustomerName}</strong>, great news — your order <strong>#${safeOrderId}</strong> has been delivered.
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 12px 20px;">
									<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #bbf7d0; border-radius: 8px; overflow: hidden; background: #f0fdf4;">
										<tbody>
											<tr>
												<td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #166534; border-bottom: 1px solid #bbf7d0;">
													<strong>Delivery Confirmation</strong>
													<div style="margin-top: 6px; color: #166534; font-size: 13px; line-height: 1.5;">
														Delivered to <strong>${safeDeliveredLocation}</strong> on <strong>${safeDeliveredAt}</strong>.
													</div>
												</td>
											</tr>
											<tr>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-right: 1px solid #bbf7d0;">
													Received By
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeRecipientName}</strong></div>
												</td>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
													Destination
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeDestination}</strong></div>
												</td>
											</tr>
											<tr>
												<td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-top: 1px solid #bbf7d0;">
													Customer Email
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCustomerEmail}</strong></div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 12px 20px;">
									<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #ececec; border-radius: 8px; overflow: hidden;">
										<tbody>
											<tr>
												<td style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
													Tracking Code
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeTrackingCode}</strong></div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 8px 20px; text-align: center;">
									<a href="${trackingUrl}" style="display: inline-block; text-decoration: none; background: #D53D3D; color: #ffffff; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 14px; font-weight: 700; padding: 12px 20px; border-radius: 6px;">
										View Delivery Details
									</a>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 20px 20px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 11px; color: #888888; line-height: 1.5; word-break: break-all;">
									You can also open this link to review the delivery status:<br />
									<a href="${trackingUrl}" style="color: #D53D3D; text-decoration: underline;">${trackingUrl}</a>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 24px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 12px; color: #666666; line-height: 1.5;">
									Thank you for choosing us. We look forward to serving you again.
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
