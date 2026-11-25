import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";
import { withUniwind } from "uniwind";

const ThemedPath = withUniwind(Path);

export function ZZZWordmark(props: {
  readonly height: number;
  readonly color?: ColorValue;
  readonly colorClassName?: string;
}) {
  const aspectRatio = 134 / 56.96;
  return (
    <Svg
      accessibilityLabel="ZZZ"
      height={props.height}
      width={props.height * aspectRatio}
      viewBox="0 0 134 56.96"
    >
      <ThemedPath
        d="M0 0H42V10.4L15 46.56H42V56.96H0V46.56L27 10.4H0ZM46 0H88V10.4L61 46.56H88V56.96H46V46.56L73 10.4H46ZM92 0H134V10.4L107 46.56H134V56.96H92V46.56L119 10.4H92Z"
        color={props.color}
        colorClassName={props.colorClassName}
        fill="currentColor"
      />
    </Svg>
  );
}
