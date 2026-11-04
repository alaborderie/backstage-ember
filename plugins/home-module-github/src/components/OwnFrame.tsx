import type { ComponentParts } from '@backstage/plugin-home-react/alpha';

/** Renders a widget's own frame instead of upstream's `InfoCard`. */
export function OwnFrame({ Content, ...props }: ComponentParts & Record<string, unknown>) {
  return <Content {...props} />;
}
