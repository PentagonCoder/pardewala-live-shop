# Pardewala operations expansion

## What will be added
- An AI-powered notebook finder that turns a shopper’s subjects, budget, and needs into live-catalogue recommendations.
- Checkout from the saved cart with address details, cash-on-delivery order creation, and online-payment preparation with server-side verification.
- A protected admin workspace for catalogue details, KG pricing, inventory, orders, and status updates.

## Important behaviour
- Checkout records immutable estimated item values; final shop weights and amounts stay separate.
- Online payment remains unavailable until Razorpay credentials are configured, while COD works immediately.
- Admin actions are authorised on the server using the existing admin role table.

## Technical details
- New server functions will calculate orders from the live catalogue and cart rather than trusting browser totals.
- Lovable AI Gateway calls stay server-side and use the assigned default model.
- A migration will add a payment transaction ledger and the policies needed for customer/admin access.
