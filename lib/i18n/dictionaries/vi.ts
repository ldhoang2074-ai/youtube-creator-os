import type { ShellMessages } from "../messages";

export const viMessages = {
  brand: "YouTube Creator OS",
  navigation: {
    ariaLabel: "Điều hướng sản phẩm",
    mobileAriaLabel: "Điều hướng sản phẩm trên thiết bị di động",
    sections: {
      research: "Nghiên cứu",
      comingSoon: "Sắp ra mắt",
    },
    statuses: {
      soon: "Sắp có",
      embedded: "Có trong kết quả nghiên cứu",
    },
    items: {
      analyzer: {
        label: "Phân tích kênh",
        title: "Phân tích kênh",
        description:
          "Phân tích hiệu suất gần đây của kênh và xác định các video nổi bật bất thường.",
      },
      compare: {
        label: "So sánh kênh",
        title: "So sánh kênh",
        description: "So sánh hiệu suất gần đây của nhiều kênh.",
      },
      opportunities: {
        label: "Cơ hội nội dung",
        title: "Cơ hội nội dung",
        description: "So sánh các video hiệu suất cao trên nhiều kênh.",
      },
      workspace: {
        label: "Không gian nghiên cứu",
        title: "Không gian nghiên cứu",
        description: "Lưu và xem lại các phiên nghiên cứu kênh.",
      },
      transcript: {
        label: "Phân tích lời thoại",
        title: "Phân tích lời thoại",
        description: "Trích xuất và xem lời thoại YouTube kèm mốc thời gian.",
      },
      titlePatterns: {
        label: "Mẫu tiêu đề",
        title: "Mẫu tiêu đề",
        description: "Có trong kết quả cơ hội và nghiên cứu đã lưu.",
      },
      contentGaps: {
        label: "Khoảng trống nội dung",
        title: "Khoảng trống nội dung",
        description:
          "Tính năng phân tích khoảng trống nội dung sẽ được phát triển ở giai đoạn sau.",
      },
      ideaGenerator: {
        label: "Trình tạo ý tưởng",
        title: "Trình tạo ý tưởng",
        description: "Tính năng tạo ý tưởng sẽ được phát triển ở giai đoạn sau.",
      },
    },
  },
  accessibility: {
    skipToContent: "Bỏ qua để đến nội dung",
    openNavigation: "Mở điều hướng",
    closeNavigation: "Đóng điều hướng",
    closeNavigationOverlay: "Đóng lớp phủ điều hướng",
  },
  fallbackPage: {
    title: "YouTube Creator OS",
    description: "Nghiên cứu kênh dành cho nhà sáng tạo.",
  },
} as const satisfies ShellMessages;
