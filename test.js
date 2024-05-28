/* exports.createOrder = async (req, res) => {
    try {
      const addressId = req.params.addressId;
      const userId = req.user._id;
      const data = req.body;
      let {
        shippingInfo,
        promoCode,
        intendedPaymentAmount,
      } = data;
  
      // Fetching address and user data
      const addressData = await addressInfo.findById(addressId).select({
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      });
  
      if (!addressData) {
        return res.status(404).json({ status: false, message: "Address not found" });
      }
  
      // Assuming shippingInfo is directly assigned from addressData for simplicity
      shippingInfo = data.shippingInfo = {...addressData };
  
      // Fetching user and cart summary data
      const userData = await User.findById(userId);
      if (!userData) {
        return res.status(404).send({ status: false, message: "User not found" });
      }
  
      const shipAmount = await shipping.findOne();
      const taxData = await TaxModel.findOne();
      const cartSummary = await cartModel.findOne({ userId: userId }).populate({
        path: "items.productId",
        select: "_id title category price unit measureUnit productImg Stock",
        model: Product,
      });
  
      if (!cartSummary || cartSummary.items.length === 0) {
        return res.status(400).json({
          status: false,
          message: "Can't place an order with an empty cart. Add your products to the cart.",
        });
      }
  
      // Calculating total quantities and updating product stocks
      let totalQuantity = 0;
      for (let i = 0; i < cartSummary.items.length; i++) {
        let Product_id = cartSummary.items[i].productId._id;
        let qty = cartSummary.items[i].quantity;
        let stock = cartSummary.items[i].productId.Stock;
        totalQuantity += qty;
        let productstock = stock - qty;
        await Product.findByIdAndUpdate(Product_id, { Stock: productstock }, { new: true });
      }
  
      // Calculating totals
      let totalPrice = cartSummary.totalPrice;
      let shippingTotal = (Number(totalQuantity) * shipAmount.shippingCharge).toFixed(3);
      let taxTotal = ((totalPrice + Number(shippingTotal)) * taxData.taxPercent / 100).toFixed(3);
      let pricewithoutCoupon = (Number(totalPrice) + Number(shippingTotal) + Number(taxTotal)).toFixed(3);
  
      // Handling promo codes
      if (promoCode) {
        const priceAfterPromo = await promoDeduct(totalPrice, promoCode);
        if (priceAfterPromo.status!== true) {
          return res.status(400).json({ status: false, message: "Invalid Promo code entry" });
        }
        data.couponCode = promoCode;
        data.promoDiscount = (totalPrice - priceAfterPromo.data).toFixed(3);
        data.totalPrice = (Number(pricewithoutCoupon) - data.promoDiscount).toFixed(3);
      } else {
        data.totalPrice = pricewithoutCoupon;
      }
  
      // Validate intended payment amount
      if (Math.abs(Number(intendedPaymentAmount) - Number(data.totalPrice)) > SOME_THRESHOLD) {
        return res.status(400).json({
          status: false,
          message: "The intended payment amount does not match the calculated total.",
        });
      }
  
      // Proceed with payment processing if online payment is selected
      if (data.paymentMethod.online === true) {
        if (!data.paymentInfo ||!(data.paymentInfo.id && data.paymentInfo.status)) {
          return res.status(400).json({
            status: false,
            message: "Please provide valid payment information if you are paying online.",
          });
        }
  
        const paymentRequest = {
          sourceId: data.paymentInfo.id,
          idempotencyKey: `${userId}-${new Date().getTime()}`,
          amountMoney: {
            amount: data.totalPrice,
            currency: 'USD',
          },
          locationId: process.env.SQUARE_LOCATION_ID,
        };
  
        const { result } = await paymentsApi.createPayment(paymentRequest);
  
        if (result.status === 'COMPLETED') {
          data.paymentStatus = 'PAID';
        } else {
          return res.status(400).json({
            status: false,
            message: "Failed to process payment through Square.",
          });
        }
      }
  
      // Creating the order
      const orderData = await Order.find();
      const orderId = (data.orderId = `ORD00${orderData.length + 1}`);
      data.userId = userId;
      const usaTimestamp = moment().format("YYYY-MM-DDTHH:mm:ss.SSS[Z]");
      data.trackingDetails = [{ trackingStatus: "Pending", trackingDate: usaTimestamp }];
      data.orderDate = usaTimestamp;
  
      const savedOrder = await Order.create(data);
  
      await cartModel.findOneAndUpdate(
        { userId: userId },
        { $set: { items: [], totalPrice: 0, totalItems: 0 } },
        { new: true }
      );
  
      // Assuming productData is a function that updates product data based on the order
      const pd = await productData(userId, savedOrder._id);
  
      // Sending email notification
      const mailOptions = {
        from: process.env.EMAIL,
        to: req.user.email,
        subject: `${addressData.firstName} ${addressData.lastName} your order Placed Successfully from Bubble Basket`,
        html: `<p>Your order has been placed successfully.</p>`,
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

 */
/* 



  paymentInfo: {
    paymentId: {
      type: String,
      required: true
    },
    createdAt: {
      type: String, 
      required: true
    },
    updatedAt: {
      type: String, 
      required: true
    },
    amountMoney: {
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        required: true
      }
    },
    totalMoney: {
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        required: true
      }
    },
    approvedMoney: {
      amount: {
        type: Number,
        required: true
      },
      currency: {
        type: String,
        required: true
      }
    },
    status: {
      type: String,
      required: true
    },
    receiptNumber: {
      type: String,
      required: true
    },
    receiptUrl: {
      type: String,
      required: true
    },
    orderId: {
      type: String,
      required: true
    },
    versionToken: {
      type: String,
      required: true
    }
  },
 */