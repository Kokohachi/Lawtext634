
import React from "react";
import type { HTMLComponentProps } from "lawtext/dist/src/renderer/common/html";

export interface ElawsPartialLawViewProps {
    lawTitle?: string,
    lawNum: string,
    article?: string,
    paragraph?: string,
    appdxTable?: string,
}

export const ElawsPartialLawView = (props: HTMLComponentProps & ElawsPartialLawViewProps) => {
    const { lawNum, article, paragraph } = props;

    return (
        <div className="text-secondary">
            外部法令参照（{lawNum}
            {article && `第${article}条`}
            {paragraph && `第${paragraph}項`}
            ）は、このシステムではサポートされていません。
        </div>
    );
};

export default ElawsPartialLawView;
