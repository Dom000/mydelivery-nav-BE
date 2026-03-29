export type OrderInTransitEmailData = {
  orderId: string;
  customerName: string;
  customerEmail: string;
  currentLocation: string;
  destination: string;
  estimatedDelivery?: string;
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

const getTrackingUrl = (order: OrderInTransitEmailData) => {
  if (order.trackingUrl) return order.trackingUrl;

  const baseUrl =
    process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const code = encodeURIComponent(order.trackingCode || order.orderId);

  return `${normalizedBase}/tracking?number=${code}`;
};

export const orderInTransitTemplate = (order: OrderInTransitEmailData) => {
  const safeCustomerName = escapeHtml(order.customerName);
  const safeOrderId = escapeHtml(order.orderId);
  const safeCurrentLocation = escapeHtml(order.currentLocation);
  const safeDestination = escapeHtml(order.destination);
  const safeCustomerEmail = escapeHtml(order.customerEmail);
  const safeTrackingCode = escapeHtml(order.trackingCode || order.orderId);
  const safeEstimatedDelivery = order.estimatedDelivery
    ? escapeHtml(order.estimatedDelivery)
    : 'We will update this soon';
  const trackingUrl = escapeHtml(getTrackingUrl(order));

  return `
<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
	<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Order In Transit</title>
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
								<td style="padding: 16px 20px 2px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #393d47;">
									<h1 style="margin: 0; font-size: 22px; line-height: 1.2;"><strong>Your Package Is In Transit</strong></h1>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 26px 16px 26px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #555555; font-size: 14px; line-height: 1.6;">
									Hi <strong>${safeCustomerName}</strong>, great news — your order <strong>#${safeOrderId}</strong> is on the way.
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 14px 20px;">
									<table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="border-collapse: collapse; border: 1px solid #ececec; border-radius: 8px; overflow: hidden;">
										<tbody>
											<tr>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-bottom: 1px solid #ececec; border-right: 1px solid #ececec;">
													Tracking Code
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeTrackingCode}</strong></div>
												</td>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-bottom: 1px solid #ececec;">
													Estimated Delivery
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeEstimatedDelivery}</strong></div>
												</td>
											</tr>
											<tr>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-right: 1px solid #ececec;">
													Current Location
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCurrentLocation}</strong></div>
												</td>
												<td class="mobile-stack" style="padding: 12px 14px; width: 50%; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666;">
													Destination
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeDestination}</strong></div>
												</td>
											</tr>
											<tr>
												<td colspan="2" style="padding: 12px 14px; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 13px; color: #666666; border-top: 1px solid #ececec;">
													Customer Email
													<div style="margin-top: 4px; color: #1f2937; font-size: 14px;"><strong>${safeCustomerEmail}</strong></div>
												</td>
											</tr>
										</tbody>
									</table>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 14px 20px; text-align: center;">
									<div style="display: inline-block; width: 100%; max-width: 420px; border: 1px solid #ececec; border-radius: 8px; padding: 10px; background: #fafafa;">
										<svg width="100%" viewBox="0 0 420 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Route progress">
											<defs>
												<linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
													<stop offset="0%" stop-color="#f87171" />
													<stop offset="100%" stop-color="#dc2626" />
												</linearGradient>
											</defs>
											<circle cx="36" cy="60" r="10" fill="#111111" />
											<text x="36" y="92" text-anchor="middle" font-size="10" fill="#444">Origin</text>

											<path d="M52 60 H335" stroke="url(#routeGradient)" stroke-width="6" stroke-linecap="round" fill="none" stroke-dasharray="10 8">
												<animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2.5s" repeatCount="indefinite" />
											</path>

											<g>
												<rect x="176" y="44" width="28" height="24" rx="4" fill="#D53D3D" />
												<rect x="182" y="36" width="16" height="10" rx="2" fill="#ef4444" />
												<circle cx="184" cy="72" r="3" fill="#222" />
												<circle cx="196" cy="72" r="3" fill="#222" />
												<animateTransform attributeName="transform" type="translate" values="0 0; 8 0; 0 0" dur="1.8s" repeatCount="indefinite" />
											</g>

											<circle cx="356" cy="60" r="10" fill="#D53D3D" />
											<text x="356" y="92" text-anchor="middle" font-size="10" fill="#444">Destination</text>
										</svg>
									</div>
								</td>
							</tr>

							<tr>
								<td style="padding: 2px 20px 16px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; color: #555555; font-size: 13px; line-height: 1.5;">
									To monitor your shipment, visit the tracking page and enter your code:<br />
									<strong style="color: #111111;">${safeTrackingCode}</strong>
								</td>
							</tr>

							<tr>
								<td style="padding: 0 20px 8px 20px; text-align: center;">
									<a href="${trackingUrl}" style="display: inline-block; text-decoration: none; background: #D53D3D; color: #ffffff; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 14px; font-weight: 700; padding: 12px 20px; border-radius: 6px;">
										Track My Package
									</a>
								</td>
							</tr>

							<tr>
								<td style="padding: 8px 20px 22px 20px; text-align: center; font-family: 'Ubuntu', Tahoma, Verdana, Segoe, sans-serif; font-size: 11px; color: #888888; line-height: 1.5; word-break: break-all;">
									If the button doesn't work, copy and paste this link into your browser:<br />
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
