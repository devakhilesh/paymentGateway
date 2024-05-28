exports.createOrder = async (req, res) => {
    try {
      const addressId = req.params.addressId;
      const userId = req.user._id;
      const data = req.body;
      let { shippingInfo, promoCode, nonce } = data;
  
      const addressData = await addressInfo.findById(addressId).select({
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      });
  
      if (!addressData) {
        return res
          .status(404)
          .json({ status: false, message: "Address not found" });
      }
  
      shippingInfo = data.shippingInfo = { ...addressData };
      ///////////////////////////////////////////////
  
      //////////////////////////////////////////////////////
  
      let userData = await User.findById(userId);
  
      if (!userData) {
        return res.status(404).send({ status: false, message: "user not found" });
      }
  
      const shipAmount = await shipping.findOne();
      // console.log(shipAmount.shippingCharge)
      const taxData = await TaxModel.findOne();
      // console.log(taxData.taxPercent)
  
      const cartSummary = await cartModel.findOne({ userId: userId }).populate({
        path: "items.productId",
        select: "_id title category price unit measureUnit productImg Stock",
        model: Product,
      });
  
      if (!cartSummary) {
        return res.status(404).send({ status: false, message: "Cart is Empty" });
      }
  
      if (cartSummary.items.length === 0) {
        return res.status(400).json({
          status: false,
          message:
            "Can't place an order with an empty cart. Add your products to the cart.",
        });
      }
  
      let totalQuantity = 0;
      // let allProducts = [];
  
      for (let i = 0; i < cartSummary.items.length; i++) {
        // let prod = {
        //   Product_id: cartSummary.items[i].productId._id,
        //   Product_quantity: cartSummary.items[i].quantity,
        // }
  
        let Product_id = cartSummary.items[i].productId._id;
  
        let qty = cartSummary.items[i].quantity;
  
        let stock = cartSummary.items[i].productId.Stock;
  
        totalQuantity = cartSummary.items[i].quantity + totalQuantity;
  
        let productstock = stock - qty;
  
        await Product.findByIdAndUpdate(
          Product_id,
          { Stock: productstock },
          { new: true }
        );
  
        // allProducts.push(prod);
      }
  
      //  totalQuantity = await  totalQuantity
  
      let totalPrice = cartSummary.totalPrice;
  
      // console.log("totalQuantity", totalQuantity)
  
      let shippingTotal = (
        Number(totalQuantity) * shipAmount.shippingCharge
      ).toFixed(3);
  
      // console.log(typeof shippingTotal, typeof taxData.taxPercent,typeof totalPrice)
  
      let taxTotal = (
        ((totalPrice + Number(shippingTotal)) * taxData.taxPercent) /
        100
      ).toFixed(3);
  
      let pricewithoutCoupon = (
        Number(totalPrice) +
        Number(shippingTotal) +
        Number(taxTotal)
      ).toFixed(3);
      // shipping data
  
      //  console.log(allProducts)
  
      const items = cartSummary.items.map((cartItem) => ({
        productId: cartItem.productId,
        quantity: cartItem.quantity,
      }));
  
      (data.items = items),
        (data.totalItems = cartSummary.totalItems),
        (data.totalShipping = shippingTotal),
        (data.totalTax = taxTotal),
        (data.price = pricewithoutCoupon);
  
      if (promoCode) {
        const priceAfterPromo = await promoDeduct(totalPrice, promoCode);
  
        if (promoCode) {
          if (priceAfterPromo.status !== true)
            return res
              .status(400)
              .json({ status: false, message: "Invalid Promo code entry" });
        }
        //  cartDetails.totalPrice =  (priceAfterPromo.data).toFixed(3)
        data.couponCode = promoCode;
        data.promoDiscount = (totalPrice - priceAfterPromo.data).toFixed(3);
        data.totalPrice = (
          Number(pricewithoutCoupon) - data.promoDiscount
        ).toFixed(3);
      } else {
        data.totalPrice = pricewithoutCoupon;
      }
  
  
  if(data.paymentMethod.online == true && data.paymentMethod.cod == true){
    return res.status(400).json({status:false, message:"choose online or cod any one of those both are true"})
  
  }
  
  if(data.paymentMethod.online == false && data.paymentMethod.cod == false){
    return res.status(400).json({status:false, message:"choose online or cod any one of those both are false"})
    
  }
  
  ///////////// set up online payments /////////////////////
  
  if (data.paymentMethod.online === true){
    
    // Convert the amount to the smallest currency unit (cents for USD)
    let amountInCents = Math.round(parseFloat(data.totalPrice) * 100);
  
    // Check if amountInCents is a BigInt and convert it to a regular number
    if (typeof amountInCents === 'bigint') {
      amountInCents = Number(amountInCents); 
    }
  
    try{
      const paymentsApi = client.paymentsApi;
      const requestBody = {
        sourceId: nonce,
        idempotencyKey: new Date().getTime().toString(),
        amountMoney: {
          amount: amountInCents, 
          currency: 'USD',
        },
        locationId: process.env.SQUARE_LOCATION_ID,
      };
  
      const { result } = await paymentsApi.createPayment(requestBody);
      console.log(result);
  
      // Convert any BigInt values in the result to regular numbers before sending the response
      const sanitizedResult = JSON.parse(JSON.stringify(result, (key, value) =>
        typeof value === 'bigint'? Number(value) : value
      ));
  
  data.paymentInfo = {
    paymentId: sanitizedResult.id,
    createdAt: sanitizedResult.createdAt,
    updatedAt: sanitizedResult.updatedAt,
    amountMoney:{
      amount: sanitizedResult.amountMoney.amount,
      currency: sanitizedResult.amountMoney.currency,
    },
    totalMoney:{
      amount: sanitizedResult.totalMoney.amount,
      currency: sanitizedResult.totalMoney.currency
    },
    approvedMoney:{
      amount: sanitizedResult.approvedMoney.amount,
      currency: sanitizedResult.approvedMoney.currency
    },
    status: sanitizedResult.status,
    receiptNumber: sanitizedResult.receiptNumber,
    receiptUrl: sanitizedResult.receiptUrl, 
    orderId: sanitizedResult.orderId,
    versionToken: sanitizedResult.versionToken
  }
  return res.status(200).json({status:true , data:data.paymentInfo})
    }catch(err){
      console.log(err)
      return res.status(500).json({status:false, message:err.message})
    }
  
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
      // Set paidAt timestamp
      if (data.paymentMethod.online === true) {
        const timestamp = Date.now();
        const dateObj = new Date(timestamp);
        data.paidAt = dateObj.toLocaleString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true,
        });
      }
  
      // Validate payment information for online payment
      console.log(data.paymentMethod.online);
  
      // if (data.paymentMethod.online === true) {
      //   if (!data.paymentInfo) {
      //     return res.status(400).json({
      //       status: false,
      //       message:
      //         "Please provide paymentInfo- Payment id and status if you are paying online",
      //     });
      //   }
      //   if (!(data.paymentInfo.id && data.paymentInfo.status)) {
      //     return res.status(400).json({
      //       status: false,
      //       message:
      //         "Please provide Payment id and status if you are paying online",
      //     });
      //   }
      // }
  
  
  
  
  
  
      const orderData = await Order.find();
  
      const orderId = (data.orderId = `ORD00${orderData.length + 1}`);
      data.userId = req.user._id;
      //default
      const usaTimestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
  
      data.trackingDetails = [
        { trackingStatus: "Pending", trackingDate: usaTimestamp },
      ];
  
      data.orderDate = usaTimestamp;
  
      const savedOrder = await Order.create(data);
  
      await cartModel.findOneAndUpdate(
        { userId: userId },
        { $set: { items: [], totalPrice: 0, totalItems: 0 } },
        { new: true }
      );
  
      const pd = await productData(userId, savedOrder._id);
  
      // return res.status(200).json(pd)
      const formatDate = (dateString) => {
        const date = new Date(dateString);
        const options = { day: "numeric", month: "long", year: "numeric" };
        const formattedDate = date.toLocaleDateString("en-US", options);
        return formattedDate;
      };
  
      const mailOptions = {
        from: process.env.email,
        to: req.user.email,
        subject: `${addressData.firstName} ${addressData.lastName} your order Placed Successfully from Bubble Basket`,
        html: `<!DOCTYPE html>
         <html lang="en">
         <head>
             <meta charset="UTF-8">
             <meta name="viewport" content="width=device-width, initial-scale=1.0">
             <title>Your Page Title</title>
             <style>
                 body {
                     font-family: Arial, sans-serif;
                     margin: 0;
                     padding: 20px;
                  
                     
                 }
                 .mail-template {
                     margin: 0 auto;
                     background-color: #ffffff;
                     border-radius: 10px;
                     padding: 20px;
                 }
                 .header, .footer {
                     text-align: center;
                     padding: 20px;
                 }
                 .header img, .footer img {
                     height: 3rem;
                 }
             
                 .content h2, .content h3 {
                     margin: 0;
                 }
                 .content p {
                     margin: 10px 0;
                 }
                 .greeting-box, .order-status, .order-details, .payment-info, .shipping-address, .your-order, .ads-box {
                     margin-bottom: 20px;
                 }
                 .order-summary, .order-details, .footer {
                     width: 100%;
                     border-collapse: collapse;
                 }
                 .order-summary th, .order-summary td, .order-details th, .order-details td {
                     border: 1px solid #dddddd;
                     padding: 10px;
                     text-align: left;
                 }
                 .order-summary th, .order-details th {
                     background-color: #f2f2f2;
                 }
                 .footer-links, .footer-social {
                     text-align: left;
                 }
                 .footer-links h4, .footer-links a, .footer-social p, .footer-social a {
                     margin: 5px 0;
                 }
                 .footer-social img {
                     height: 2rem;
                     margin-right: 10px;
                 }
                 .product_img{
                   height:100px;
                 }
                 .design_img{
                   height:200px;
                 }
                 .greeting-box{
                   display:flex;
                   flex-direction:column;
                 }
                 .header{
                 
                   width: 100%;
                 }
          
               .order_time{
                 display:flex;
                 flex-direction:column;
                 align-items:flex-end;
               }
               .order_time p{
                 margin:0;
               }
               #order_image{
                 width: 100%;
                 margin-left: -3rem;
                 
               }
               .delivery-status {
                 width: 100%;
                 border-collapse: collapse;
               
             }
             
             .delivery-status td {
                 text-align: center;
               
                 padding: 10px;
                 width: 33.33%; /* Equal distribution for three columns */
             }
             .order-status-img{ 
               height:15px;
             }
             .order-status{
             
               width: 100%;
             }
             .your-order {
               display: flex;
               align-items: center;
               gap: 1rem;
             }
             .your-order button {
               padding: 1.5rem 1rem;
               height: 2rem;
               width: 10rem;
               display: flex;
               align-items: center;
               justify-content: center;
               border: 1px gray solid;
               background: transparent;
               color: rgb(199, 21, 80);
               font-size: 1rem;
               border-radius: 15px;
             }
             </style>
         </head>
         <body>
             <div class="mail-template">
         
             <table class="header">
             <tr >
                 <td >
                     <a id="order_image" href="https://bubble-basket.vercel.app/" target="_blank">
                         <img  src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715670590/zun4zqqt9cwuj7kvv3ux.jpg" alt="Logo">
                     </a>
                 </td>
                 <td class="order_time">
                     <p>Order Total: $${pd?.totalPrice}</p>
                     <p>${formatDate(pd?.orderDate)} ${pd?.totalItems} Item</p>
                 </td>
             </tr>
         </table>
                 <table class="content">
      
                     <tr>
                         <td colspan="2" class="greeting-box">
                             <p class="greeting">Woohoo!</p>
                             <p>
                                 Hi  ${
                                   pd?.shippingInfo?.firstName
                                 }, thank you for placing your order with us. Please
                                 expect the delivery by Tue, 30 Apr. We've provided all your
                                 confirmation details here.
                             </p>
                         </td>
                         <td>
                             <a href="https://bubble-basket.vercel.app/Product" target="_blank">
                                 <img class="design_img" src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715586942/i1yfmnf6sa6ubbgh0xgg.png" alt="Product">
                             </a>
                         </td>
                     </tr>
                     <tr>
                         <td colspan="3" >
                             <table class="delivery-status">
                                 <tr>
                                     <td>
                                         <img class="order-status-img" src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715674774/camrlhxps8x2lrasauii.png" alt="Confirmed">
                                         <p>Confirmed</p>
                                     </td>
                                     <td>
                                         <input type="radio" disabled>
                                         <p>Shipped</p>
                                     </td>
                                     <td>
                                         <input type="radio" disabled>
                                         <p>Delivered</p>
                                     </td>
                                 </tr>
                             </table>
                         </td>
                     </tr>
                     <tr>
                         <td colspan="3" class="order-status">
                             <h2>Order ${pd?.orderId}</h2>
                             <p>${pd?.totalItems} item | ${formatDate(
          pd?.orderDate
        )}</p>
                         </td>
                     </tr>
                     <tr>
                         <td colspan="3" >
                             <table class="order-details">
                                 ${pd?.productData
                                   .map(
                                     (item) => `
                                 <tr>
                                     <td><img class="product_img" src="${item?.ProductImg}" alt="Product Image"></td>
                                     <td>
                                         <p class="product-dec">${item?.Product_title}</p>
                                         <p>Measure Unit: ${item?.Product_measureUnit}</p>
                                         <p style="color: grey;">Sold by Luxury Bubble Basket</p>
                                     </td>
                                     <td>x ${item?.Product_quantity}</td>
                                     <td>
                                         <span>${item?.Product_totalPrice}</span><br>
                                         <span style="text-decoration: line-through;">$${item?.Product_price}</span> 
                                         <span style="color: red;">[-5%]</span>
                                     </td>
                                 </tr>
                                 `
                                   )
                                   .join("")}
                             </table>
                         </td>
                     </tr>
                     <tr>
                         <td colspan="3" >
                             <table class="order-summary">
                                 <tr>
                                     <td>Subtotal:</td>
                                     <td>$${pd?.subTotal}</td>
                                 </tr>
                                 <tr>
                                     <td>Shipping and handling:</td>
                                     <td>${
                                       pd.totalShipping === 0
                                         ? "FREE"
                                         : "$" + pd.totalShipping
                                     }</td>
                                 </tr>
                                 <tr>
                                     <td>Discount:</td>
                                     <td>$0</td>
                                 </tr>
                                 <tr>
                                     <th>Grand Total (Incl. Tax):</th>
                                     <th>$${pd?.totalPrice}</th>
                                 </tr>
                                 <tr>
                                     <th>Amount Due:</th>
                                     <th>$${pd?.totalPrice}</th>
                                 </tr>
                             </table>
                         </td>
                     </tr>
                     <tr>
                         <td colspan="3" class="payment-info">
                             <h2>Payment Information</h2>
                             <table class="payment-info-box">
                                 <tr>
                                     <td>
                                         <img src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715594127/nqbn1vdim0byytgoak08.png" />
                         </td>
                         <td>
                             <span>${
                               pd?.paymentMethod?.cod
                                 ? "Cash ON DELIVERY"
                                 : "ONLINE"
                             }</span>
                             <p>Cash on Delivery was your pick: $${
                               pd?.totalPrice
                             }</p>
                         </td>
                     </tr>
                 </table>
             </td>
         </tr>
         <tr>
             <td colspan="3" class="shipping-address">
                 <h2>Shipping Address</h2>
                 <p>${pd?.shippingInfo?.firstName}</p>
                 <p>${pd?.shippingInfo?.streetAddress?.apartment}, ${
          pd?.shippingInfo?.streetAddress?.houseNoAndStreetName
        }</p>
                 <p>${pd?.shippingInfo?.townCity}, ${
          pd?.shippingInfo?.stateCounty
        }, ${pd?.shippingInfo?.postcodeZIP}</p>
                 <p>${pd?.shippingInfo?.country}</p>
             </td>
         </tr>
         <tr>
             <td colspan="3" class="your-order">
                 <p>Keep an eye, track the status of your order or re-order any time!</p>
                 <a href="https://bubble-basket.vercel.app/OrderHistory" target="_blank">
                     <button>Your Orders</button>
                 </a>
             </td>
         </tr>
         <tr>
             <td colspan="3" class="ads-box">
                 <a href="https://bubble-basket.vercel.app/" target="_blank">
                     <img src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715672340/womblka4czr8ej4yyoxh.gif" alt="Ad Image 1">
                 </a>
                 <a href="https://bubble-basket.vercel.app/" target="_blank">
                     <img src="https://res.cloudinary.com/dscgsptzy/image/upload/v1715679220/fkmqdmmccdlrkbiskhh9.jpg" alt="Ad Image 2">
                 </a>
             </td>
         </tr>
         </table>
         
     
         </div>
         </body>
     </html>`,
      };
  
      await sendMail(mailOptions);
  
      res.status(201).json({
        status: true,
        message: "Order created successfully",
        data: savedOrder,
      });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Failed to create order",
        error: error.message,
      });
    }
  };