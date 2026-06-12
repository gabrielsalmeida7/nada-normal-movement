import type { IPaymentBrickCustomization } from "@mercadopago/sdk-react/esm/bricks/payment/type";

/** Tema alinhado ao design system Nada Normal (dark + neon purple). */
export const nnPaymentBrickCustomization: IPaymentBrickCustomization = {
  paymentMethods: {
    ticket: "all",
    bankTransfer: "all",
    creditCard: "all",
    prepaidCard: "all",
    debitCard: "all",
    mercadoPago: "all",
  },
  visual: {
    style: {
      theme: "dark",
      customVariables: {
        baseColor: "#9933ff",
        baseColorFirstVariant: "#7a29cc",
        baseColorSecondVariant: "#bf80ff",
        buttonTextColor: "#ffffff",
        textPrimaryColor: "#fafafa",
        textSecondaryColor: "#a8a3b8",
        formBackgroundColor: "#2a2835",
        inputBackgroundColor: "#1a1824",
        outlinePrimaryColor: "#9933ff",
        outlineSecondaryColor: "#3d3a4d",
        successColor: "#80ff00",
        errorColor: "#ff3333",
        borderRadiusSmall: "4px",
        borderRadiusMedium: "8px",
        borderRadiusLarge: "12px",
        fontSizeSmall: "14px",
        fontSizeMedium: "16px",
        fontWeightSemiBold: "600",
      },
    },
  },
};
