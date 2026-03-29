export type OrderInterruptedEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  currentLocation?: string;
  destination: string;
  reason?: string;
  trackingCode?: string;
  trackingUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
};

const escapeHtml = (value: string) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getTrackingUrl = (order: OrderInterruptedEmailData) => {
  if (order.trackingUrl) return order.trackingUrl;

  const baseUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const code = encodeURIComponent(order.trackingCode || order.orderId);

  return `${normalizedBase}/tracking?number=${code}`;
};

export const orderInterruptedTemplate = (order: OrderInterruptedEmailData) => {
  const safeCustomerName = escapeHtml(order.customerName);
  const safeOrderId = escapeHtml(order.orderId);
  const safeCustomerEmail = escapeHtml(order.customerEmail);
  const safeDestination = escapeHtml(order.destination);
  const safeCurrentLocation = escapeHtml(order.currentLocation || 'Unknown');
  const safeReason = escapeHtml(
    order.reason ||
      'Unexpected logistics constraints affected your shipment progress.',
  );
  const safeTrackingCode = escapeHtml(order.trackingCode || order.orderId);

  const supportEmail =
    order.supportEmail ||
    process.env.SUPPORT_EMAIL ||
    'support@mydeliverynav.com';
  const supportPhone =
    order.supportPhone || process.env.SUPPORT_PHONE || '+1 (800) 000-0000';
  const safeSupportEmail = escapeHtml(supportEmail);
  const safeSupportPhone = escapeHtml(supportPhone);

  const trackingUrl = escapeHtml(getTrackingUrl(order));

  return `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Shipment Update - Action Required</title>
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
								<td style="padding: 16px 20px 4px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #7f1d1d;">
									<h1 style="margin: 0; font-size: 22px; line-height: 1.2;"><strong>Shipment Interrupted</strong></h1>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 26px 16px 26px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #555555; font-size: 14px; line-height: 1.6;">
									Hi <strong>${safeCustomerName}</strong>, we’re sorry — your order <strong>#${safeOrderId}</strong> is currently interrupted.
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 12px 20px;">
									<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; background: #fff7f7;">
										<tbody>
											<tr>
												<td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #7f1d1d; border-bottom: 1px solid #fecaca;">
													<strong>Interruption Details</strong>
													<div style="margin-top: 6px; color: #7f1d1d; font-size: 13px; line-height: 1.5;">${safeReason}</div>
												</td>
											</tr>
											<tr>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-right: 1px solid #fecaca;">
													Current Location
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCurrentLocation}</strong></div>
												</td>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
													Destination
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeDestination}</strong></div>
												</td>
											</tr>
											<tr>
												<td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-top: 1px solid #fecaca;">
													Customer Email
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCustomerEmail}</strong></div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 14px 20px;">
									<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #ececec; border-radius: 8px; overflow: hidden;">
										<tbody>
											<tr>
												<td style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-bottom: 1px solid #ececec;">
													Tracking Code
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeTrackingCode}</strong></div>
												</td>
											</tr>
											<tr>
												<td style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
													Need immediate help?
													<div style="margin-top: 6px; color: #1f2937; font-size: 14px; line-height: 1.6;">
														Contact support at <a href="mailto:${safeSupportEmail}" style="color: #D53D3D; text-decoration: underline;">${safeSupportEmail}</a><br />
														or call <a href="tel:${safeSupportPhone}" style="color: #D53D3D; text-decoration: underline;">${safeSupportPhone}</a>
													</div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 8px 20px; text-align: center;">
									<a href="${trackingUrl}" style="display: inline-block; text-decoration: none; background: #D53D3D; color: #ffffff; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 14px; font-weight: 700; padding: 12px 20px; border-radius: 6px;">
										Track Shipment Status
									</a>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 20px 20px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 11px; color: #888888; line-height: 1.5; word-break: break-all;">
									You can also open this link and insert your tracking code on the website:<br />
									<a href="${trackingUrl}" style="color: #D53D3D; text-decoration: underline;">${trackingUrl}</a>
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
