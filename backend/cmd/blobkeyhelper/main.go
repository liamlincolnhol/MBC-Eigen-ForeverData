package main

import (
    "encoding/hex"
    "fmt"
    "io"
    "log"
    "os"
    "strings"

    corev2 "github.com/Layr-Labs/eigenda/core/v2"
)

func main() {
    stdin, err := io.ReadAll(os.Stdin)
    if err != nil {
        log.Fatalf("read input: %v", err)
    }

    input := strings.TrimSpace(string(stdin))
    if input == "" {
        log.Fatal("no certificate data provided")
    }

    if strings.HasPrefix(input, "0x") || strings.HasPrefix(input, "0X") {
        input = input[2:]
    }

    certBytes, err := hex.DecodeString(input)
    if err != nil {
        log.Fatalf("decode hex: %v", err)
    }

    cert, err := corev2.DeserializeBlobCertificate(certBytes)
    if err != nil {
        log.Fatalf("deserialize blob certificate: %v", err)
    }

    if cert.BlobHeader == nil {
        log.Fatal("blob certificate missing blob header")
    }

    blobKey, err := cert.BlobHeader.BlobKey()
    if err != nil {
        log.Fatalf("compute blob key: %v", err)
    }

    fmt.Printf("0x%s", blobKey.Hex())
}
