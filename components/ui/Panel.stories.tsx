import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Panel } from "./Panel";

const meta = {
  title: "components/Panel",
  component: Panel,
} satisfies Meta<typeof Panel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    children: "Primary Panel",
  },
};
